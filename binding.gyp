{
  'variables': {
    'copy_licenses': 0,
    'enable_gcov': 0,
    'napi_build_version': 3,
    'conditions': [
      ['OS!="win"', {
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
        # Prevent using external buffers, which would break on Electron
        'NODE_API_NO_EXTERNAL_BUFFERS_ALLOWED',
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
          'conditions': [
            ['target_arch=="x64"', {
              'xcode_configuration_platform': 'x86_64',
            }],
          ],
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
      ],
    },
    {
      'target_name': 'copy_licenses',
      'type': 'none',
      'conditions': [
        ['copy_licenses==1', {
          'copies': [{
            'files': ['LICENSE', 'NOTICE'],
            'destination': '<(PRODUCT_DIR)',
          }],
          'actions': [{
            'action_name': 'zstd_license',
            'inputs': ['deps/zstd/LICENSE'],
            'outputs': ['<(PRODUCT_DIR)/LICENSE.zstd'],
            'action': ['cp', 'deps/zstd/LICENSE', '<@(_outputs)'],
          }],
        }],
      ],
    },
  ],
}
