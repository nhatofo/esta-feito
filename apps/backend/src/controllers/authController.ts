import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { twilioService } from '../services/twilioService';
import { normalizeMozPhone, isValidMozPhone } from '@esta-feito/shared';
import type { ApiResponse, LoginResponse, UserRole } from '@esta-feito/shared';

// ── Token helpers ─────────────────────────────

function generateTokens(userId: string) {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as any }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '30d') as any }
  );
  return { accessToken, refreshToken };
}

function generateOtp(): string {
  // 6-digit OTP
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Controllers ───────────────────────────────

/**
 * POST /api/auth/request-otp
 * Sends a 6-digit OTP via SMS to the given Mozambican phone number.
 */
export async function requestOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { phone } = req.body as { phone: string };
    const normalized = normalizeMozPhone(phone);

    if (!isValidMozPhone(normalized)) {
      res.status(400).json({ success: false, error: 'Número de telefone inválido.' } satisfies ApiResponse<never>);
      return;
    }

    const otp = generateOtp();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await User.findOneAndUpdate(
      { phone: normalized },
      { otp, otpExpiry: expiry },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await twilioService.sendOtp(normalized, otp);

    res.json({ success: true, message: 'Código OTP enviado com sucesso.' } satisfies ApiResponse<never>);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/verify-otp
 * Verifies OTP. Creates user if first time, returns JWT tokens.
 */
export async function verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { phone, otp, fullName, role } = req.body as {
      phone: string;
      otp: string;
      fullName?: string;
      role?: UserRole;
    };

    const normalized = normalizeMozPhone(phone);
    const user = await User.findOne({ phone: normalized });

    if (!user) {
      res.status(404).json({ success: false, error: 'Utilizador não encontrado.' } satisfies ApiResponse<never>);
      return;
    }

    // Check OTP expiry
    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      res.status(400).json({ success: false, error: 'OTP expirado. Solicite um novo.' } satisfies ApiResponse<never>);
      return;
    }

    const isValid = await user.compareOtp(otp);
    if (!isValid) {
      res.status(400).json({ success: false, error: 'OTP inválido.' } satisfies ApiResponse<never>);
      return;
    }

    // First-time registration
    const isNewUser = !user.isVerified;
    if (isNewUser) {
      if (!fullName || !role) {
        res.status(400).json({ success: false, error: 'Nome completo e função são obrigatórios no registo.' } satisfies ApiResponse<never>);
        return;
      }
      user.fullName = fullName;
      user.role = role;
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;

    const tokens = generateTokens(String(user._id));
    user.refreshToken = tokens.refreshToken;
    await user.save();

    const responseData: LoginResponse = {
      user: user.toJSON() as any,
      tokens,
    };

    res.json({ success: true, data: responseData } satisfies ApiResponse<LoginResponse>);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/refresh
 * Issues a new access token given a valid refresh token.
 */
export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken: token } = req.body as { refreshToken: string };

    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { userId: string };
    const user = await User.findById(payload.userId);

    if (!user || user.refreshToken !== token) {
      res.status(401).json({ success: false, error: 'Token de atualização inválido.' } satisfies ApiResponse<never>);
      return;
    }

    const tokens = generateTokens(String(user._id));
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json({ success: true, data: tokens } satisfies ApiResponse<typeof tokens>);
  } catch {
    res.status(401).json({ success: false, error: 'Token inválido ou expirado.' } satisfies ApiResponse<never>);
  }
}

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile.
 */
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById((req as any).userId).select('-otp -otpExpiry -refreshToken');
    if (!user) {
      res.status(404).json({ success: false, error: 'Utilizador não encontrado.' } satisfies ApiResponse<never>);
      return;
    }
    res.json({ success: true, data: user } satisfies ApiResponse<typeof user>);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 */
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await User.findByIdAndUpdate((req as any).userId, { $unset: { refreshToken: 1 } });
    res.json({ success: true, message: 'Sessão encerrada.' } satisfies ApiResponse<never>);
  } catch (err) {
    next(err);
  }
}
