{
  'targets': [
    {
      'target_name': 'libzstd',
      'includes': ['../build_flags.gypi'],
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
        'zstd/lib/compress/zstd_compress_superblock.c',
        'zstd/lib/compress/zstd_double_fast.c',
        'zstd/lib/compress/zstd_fast.c',
        'zstd/lib/compress/zstd_lazy.c',
        'zstd/lib/compress/zstd_ldm.c',
        'zstd/lib/compress/zstd_opt.c',
        'zstd/lib/compress/zstd_preSplit.c',
        'zstd/lib/compress/zstdmt_compress.c',
        'zstd/lib/decompress/huf_decompress.c',
        'zstd/lib/decompress/huf_decompress_amd64.S',
        'zstd/lib/decompress/zstd_ddict.c',
        'zstd/lib/decompress/zstd_decompress_block.c',
        'zstd/lib/decompress/zstd_decompress.c',
      ],
      'cflags+': ['-fvisibility=hidden'],
      'defines': [
        'XXH_NAMESPACE=ZSTD_',
        'ZSTDERRORLIB_VISIBLE=',
        'ZSTDLIB_VISIBLE=',
        'ZSTD_MULTITHREAD',
        'ZSTD_NO_TRACE',
      ],
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
        ['OS=="win"', {
          'sources!': [
            # MSVC doesn't support GAS assembly syntax
            'zstd/lib/decompress/huf_decompress_amd64.S',
          ],
        }],
      ],
    },
  ]
}
