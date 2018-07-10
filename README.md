# cfdns
[![](https://img.shields.io/npm/v/cfdns.svg?style=flat)](https://www.npmjs.org/package/cfdns) [![](https://img.shields.io/npm/dm/cfdns.svg)](https://www.npmjs.org/package/cfdns) [![](https://api.travis-ci.org/silverwind/cfdns.svg?style=flat)](https://travis-ci.org/silverwind/cfdns)

> CLI to modify DNS records hosted on Cloudflare

## Install

```sh
$ npm i -g cfdns
```

## Usage

```bash
$ cfdns login user@example.com 4c689aa3462a44a121c1f199c1081240b9be4
$ cfdns update example.com a 1.2.3.4 120
$ cfdns get example.com a
$ cfdns delete example.com a
```

### Limitations

- Only supports one record per name and type combination

## License

© [silverwind](https://github.com/silverwind), distributed under BSD licence
