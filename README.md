# cfa
[![](https://img.shields.io/npm/v/cfa.svg?style=flat)](https://www.npmjs.org/package/cfa) [![](https://img.shields.io/npm/dm/cfa.svg)](https://www.npmjs.org/package/cfa) [![](https://api.travis-ci.org/silverwind/cfa.svg?style=flat)](https://travis-ci.org/silverwind/cfa)

> CLI to modify DNS records via the Cloudflare v4 API

## Install

```sh
$ npm i -g cfa
```

## Usage

```bash
$ cfa login user@example.com 4c689aa3462a44a121c1f199c1081240b9be4
$ cfa update example.com a 1.2.3.4 120
$ cfa get example.com a
$ cfa delete example.com a
```

### Limitations

- Only supports one record per name and type combination

## License

© [silverwind](https://github.com/silverwind), distributed under BSD licence
