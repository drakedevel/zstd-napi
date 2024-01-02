# Changelog

## [Unreleased]

### Added

- API documentation.
- High-level `compress` and `decompress` convenience functions.
- Low-level bindings for `ZSTD_defaultCLevel` and `ZSTD_getDictID_fromCDict`.
- Prebuilds for GNU/Linux on arm64 and armv7, Windows on ia32.

### Changed

- Build GNU/Linux prebuilds on Debian 10 (Glibc 2.28).
- Class type definitions for the low-level bindings now have brands to prevent interchanging e.g. `CDict` and `DDict`.
- Upgrade `node-addon-api` to 7.x.

### Removed

- Prebuilds for Node-API 6.
- Support for Node-API < 8.
- Support for GNU/Linux with Glibc < 2.28.
- Support for TypeScript < 4.3.

### Fixed

- Bindings use type tags (added in Node-API 8) to prevent passing an invalid native object type as a parameter.

## [0.0.7] - 2023-06-14

### Added

- Prebuilds for macOS on arm64.

### Changed

- Upgrade Zstandard to 1.5.5.

### Removed

- Support for Node < 16.
