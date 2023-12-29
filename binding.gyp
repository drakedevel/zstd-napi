{
  'variables': {
    'disable_cpp14': 0,
    'enable_gcov': 0,
    'napi_build_version': 3,
    'conditions': [
      ['OS!="win"', {
        'disable_cpp14': '<!(echo $ZSTD_NAPI_DISABLE_CPP14)',
        'enable_gcov': '<!(echo $ZSTD_NAPI_ENABLE_GCOV)',
      }],
    ],
  },
  'targets': [
    {
      'target_name': 'binding',
      'sources': ['src/binding.cc', 'src/cctx.cc', 'src/cdict.cc', 'src/constants.cc', 'src/dctx.cc', 'src/ddict.cc'],
      'dependencies': ['deps/zstd.gyp:libzstd'],
      'include_dirs': ["<!(node -p \"require('node-addon-api').include_dir\")"],
      'defines': [
        'NAPI_VERSION=<(napi_build_version)',
        'NODE_ADDON_API_DISABLE_DEPRECATED',
        # Prevent crash if we try to throw an exception during worker shutdown,
        # see nodejs/node-addon-api#975 for more context
        'NODE_API_SWALLOW_UNTHROWABLE_EXCEPTIONS',
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
          'defines': ['_HAS_EXCEPTIONS=1'],
          'msvs_settings': {
            'VCCLCompilerTool': {'ExceptionHandling': 1},
          },
        }],
        ['enable_gcov==1', {
          'cflags+': ['--coverage', '-fno-inline', '-fprofile-abs-path'],
          'ldflags+': ['--coverage'],
        }],
        ['disable_cpp14==1', {
          'cflags_cc!': ['-std=gnu++14'],
          'cflags_cc+': ['-std=gnu++1y'],
        }],
      ],
    },
  ],
}
