# Changelog

## [Unreleased]

### Fixed

- From-source builds now work on Windows without requiring POSIX command-line utilities. (#92)

## [0.0.8] - 2024-04-07

### Added

- API documentation.
- High-level `compress` and `decompress` convenience functions.
- Low-level bindings for `ZSTD_defaultCLevel` and `ZSTD_getDictID_fromCDict`.
- Prebuilds for GNU/Linux on arm64 and armv7, Windows on ia32.
- New `targetCBlockSize` compression parameter, stabilized in Zstandard 1.5.6.
- Releases now include [SLSA Build L3](https://slsa.dev/spec/v1.0/levels#build-l3) provenance attestations.

### Changed

- Build GNU/Linux prebuilds on Debian 10 (Glibc 2.28).
- Class type definitions for the low-level bindings now have brands to prevent interchanging e.g. `CDict` and `DDict`.
- Upgrade `node-addon-api` to 7.x.
- Upgrade Zstandard to 1.5.6.

### Removed

- Prebuilds for Node-API 6.
- Support for Node-API < 8.
- Support for GNU/Linux with Glibc < 2.28.
- Support for TypeScript < 4.3.

### Fixed

- Bindings use type tags (added in Node-API 8) to prevent passing an invalid native object type as a parameter.
- Types no longer require `esModuleInterop` to be enabled.

## [0.0.7] - 2023-06-14

### Added

- Prebuilds for macOS on arm64.

### Changed

- Upgrade Zstandard to 1.5.5.

### Removed

- Support for Node < 16.
