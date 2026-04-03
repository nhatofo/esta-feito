module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'nativewind/babel',
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@esta-feito/shared': '../../packages/shared/index.ts',
            '@': './',
          },
        },
      ],
    ],
  };
};
