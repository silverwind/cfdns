# cfdns
[![](https://img.shields.io/npm/v/cfdns.svg?style=flat)](https://www.npmjs.org/package/cfdns) [![](https://img.shields.io/npm/dm/cfdns.svg)](https://www.npmjs.org/package/cfdns) [![](https://packagephobia.com/badge?p=cfdns)](https://packagephobia.com/result?p=cfdns)

> CLI to modify DNS records hosted on Cloudflare

## Usage

```sh
pnpm dlx cfdns login user@example.com 4c689aa3462a44a121c1f199c1081240b9be4
pnpm dlx cfdns set example.com a 1.2.3.4 120
```

## Options

```
usage: cfdns [options] command [args]

  Commands:
    login <email> <key>                 Log in to the API
    get <name> <type>                   Retrieve a DNS record
    set <name> <type> <value> [<ttl>]   Create or update a DNS record
    del <name> <type>                   Delete a DNS record
    logout                              Log out from the API

  Options:
    -c, --color                         Force-enable color output
    -n, --no-color                      Disable color output
    -v, --version                       Print the version
    -h, --help                          Print this help

  Example:
    $ cfdns login user@example.com 4c689aa3462a44a121c1f199c1081240b9be4
    $ cfdns set example.com a 1.2.3.4 120
    $ cfdns get example.com a
    $ cfdns del example.com a
```

Only one record per name and type combination is supported.

© [silverwind](https://github.com/silverwind), distributed under BSD licence
