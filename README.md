[![npm](https://img.shields.io/npm/v/zstd-napi)](https://www.npmjs.com/package/zstd-napi)
[![codecov](https://codecov.io/github/drakedevel/zstd-napi/graph/badge.svg?token=Ry4jOq8sCE)](https://codecov.io/github/drakedevel/zstd-napi)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/drakedevel/zstd-napi/badge)](https://securityscorecards.dev/viewer/?uri=github.com/drakedevel/zstd-napi)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/8241/badge)](https://www.bestpractices.dev/projects/8241)

# zstd-napi

`zstd-napi` is a TypeScript binding to the native [Zstandard][zstd] compression library, using the [Node-API][node-api] addon interface.

A strong emphasis has been placed on reliability and performance. It has been used for years in at least one production envionment where it is invoked more than a million times per second.

[zstd]: https://github.com/facebook/zstd
[node-api]: https://nodejs.org/docs/latest/api/n-api.html

## Getting Started

To install, just run `npm install zstd-napi` (or the equivalent for your choice of package manager). By default, this will download a pre-built native module suitable for your platform from the corresponding [GitHub release][gh-release]. If a prebuild isn't available, it will try to build the module from source, which should work as long as you have a C++ compiler installed.

Once installed, usage is as simple as:

```ts
import * as zstd from 'zstd-napi';
zstd.compress(Buffer.from('your data here'));
```

See the [API documentation][api-docs] for more details!

[api-docs]: https://drakedevel.github.io/zstd-napi/
[gh-release]: https://github.com/drakedevel/zstd-napi/releases

## Features

The library exposes all of the functionality present in the stable Zstandard API, including dictionary compression, multithreading, advanced compression parameters, and more.

Most of this functionality is available through a [high-level API][hl-api], which is the recommended way to use the library for nearly all applications. Both streaming and single-pass interfaces are available.

The high-level API is built on top of the [low-level API][ll-api], which is exposed as `zstd-napi/binding`. This is a wrapper around the raw Zstandard API designed to be as thin as possible while preventing JavaScript code from doing anything memory-unsafe. Notably, buffer management is left to the caller. It may be useful as a building block for another library developer, or for applications with specialized use-cases. Most users will be happier using the high-level API.

Currently, there's no support for the (unstable) Zstandard "experimental" API, but at least partial support is planned for the future. If there's functionality you'd like to use, please [file an issue][new-issue] and let me know!

[hl-api]: https://drakedevel.github.io/zstd-napi/modules/index.html
[ll-api]: https://drakedevel.github.io/zstd-napi/modules/binding.html
[new-issue]: https://github.com/drakedevel/zstd-napi/issues/new/choose

## Support Policy

### Node.js

All live Node.js verisons are supported on a first-class basis. Per the [release cycle][node-releases], this includes the Current version, the Active LTS version, and one or more Maintenance versions. In addition, one previous LTS version is supported on a best-effort basis. As of the latest `zstd-napi` release, this means:

| Node.js Version |   Support   |
| --------------- | :---------: |
| 22 (Current)    |     ✅      |
| 20 (Active LTS) |     ✅      |
| 18 (Maint. LTS) |     ✅      |
| 16              | best-effort |

Other versions may work, but they aren't regularly tested and may break at any time.

[node-releases]: https://github.com/nodejs/release#release-schedule

### Platform

All of the native code in this project is fairly portable, so in principle `zstd-napi` should work on any platform supported by both Node.js and Zstandard.

Prebuilds are provided for all platforms with [Tier 1 support][tier-1] in Node.js. This includes GNU/Linux armv7, arm64, and x64, macOS arm64 and x64, and Windows x64 and x86. GNU/Linux prebuilds are linked against Glibc 2.28, which is the same version required by official Node.js 18+ builds.

Please [file an issue][new-issue] if this library doesn't work on your platform!

[tier-1]: https://github.com/nodejs/node/blob/main/BUILDING.md#platform-list

### Zstandard

`zstd-napi`'s native component statically links Zstandard, currently version 1.5.6. Newer versions will be pulled in as they are released.

### Security Updates

This project will make every effort to promptly release fixes for discovered security vulnerabilties. Whenever possible, patches will be released for previous release branches to allow affected users to easily upgrade without other breaking changes.
