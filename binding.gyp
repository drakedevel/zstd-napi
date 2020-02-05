{
  'variables': {
    'napi_build_version': 3
  },
  'targets': [
    {
      'target_name': '<(module_name)',
      'sources': ['src/binding.cc', 'src/cctx.cc', 'src/cdict.cc', 'src/constants.cc', 'src/dctx.cc', 'src/ddict.cc'],
      'dependencies': ['deps/zstd.gyp:libzstd'],
      'include_dirs': ["<!@(node -p \"require('node-addon-api').include\")"],
      'defines': [
        'NAPI_VERSION=<(napi_build_version)',
        'NODE_ADDON_API_DISABLE_DEPRECATED',
      ],
      'cflags!': ['-fno-exceptions'],
      'cflags_cc!': ['-fno-exceptions'],
      'conditions': [
        ['OS=="mac"', {
          'cflags+': ['-fvisibility=hidden'],
          'xcode_settings': {
            'CLANG_CXX_LIBRARY': 'libc++',
            'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
            'GCC_SYMBOLS_PRIVATE_EXTERN': 'YES',
            'MACOSX_DEPLOYMENT_TARGET': '10.7',
          },
        }],
        ['OS=="win"', {
          'msvs_settings': {
            'VCCLCompilerTool': {'ExceptionHandling': 1},
          },
        }],
      ],
    },
    {
      'target_name': 'action_after_build',
      'type': 'none',
      'dependencies': ['<(module_name)'],
      'copies': [
        {
          'files': ['<(PRODUCT_DIR)/<(module_name).node'],
          'destination': '<(module_path)'
        },
      ],
    },
  ],
}
