{
  'targets': [
    {
      'target_name': 'libzstd',
      'type': 'static_library',
      'sources': [
        'zstd/lib/common/debug.c',
        'zstd/lib/common/entropy_common.c',
        'zstd/lib/common/error_private.c',
        'zstd/lib/common/fse_decompress.c',
        'zstd/lib/common/pool.c',
        'zstd/lib/common/threading.c',
        'zstd/lib/common/xxhash.c',
        'zstd/lib/common/zstd_common.c',
        'zstd/lib/compress/fse_compress.c',
        'zstd/lib/compress/hist.c',
        'zstd/lib/compress/huf_compress.c',
        'zstd/lib/compress/zstd_compress.c',
        'zstd/lib/compress/zstd_compress_literals.c',
        'zstd/lib/compress/zstd_compress_sequences.c',
        'zstd/lib/compress/zstd_double_fast.c',
        'zstd/lib/compress/zstd_fast.c',
        'zstd/lib/compress/zstd_lazy.c',
        'zstd/lib/compress/zstd_ldm.c',
        'zstd/lib/compress/zstd_opt.c',
        'zstd/lib/decompress/huf_decompress.c',
        'zstd/lib/decompress/zstd_ddict.c',
        'zstd/lib/decompress/zstd_decompress_block.c',
        'zstd/lib/decompress/zstd_decompress.c',
      ],
      'cflags+': ['-fvisibility=hidden'],
      'defines': ['XXH_NAMESPACE=ZSTD_'],
      'include_dirs': ['zstd/lib', 'zstd/lib/common'],
      'direct_dependent_settings': {
        'include_dirs': ['zstd/lib'],
      },
      'conditions': [
        ['OS=="mac"', {
          'xcode_settings': {
            'GCC_SYMBOLS_PRIVATE_EXTERN': 'YES',
            'MACOSX_DEPLOYMENT_TARGET': '10.7',
          },
        }],
      ],
    },
  ]
}
