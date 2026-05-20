#!/usr/bin/env node
import minimist from "minimist";
import chalk from "chalk";
import {join} from "node:path";
import {homedir} from "node:os";
import {readFile, writeFile, chmod, unlink} from "node:fs/promises";
import {argv, exit as processExit} from "node:process";
import pkg from "./package.json" with {type: "json"};

const args = minimist(argv.slice(2), {
  boolean: [
    "c", "color",
    "h", "help",
    "n", "no-color",
    "v", "version",
  ],
  string: [
    "_",
  ],
  alias: {
    c: "color",
    h: "help",
    n: "no-color",
    v: "version",
  },
});

function exit(err?: string) {
  if (err) console.info(`Error: ${err}`);
  processExit(err ? 1 : 0);
}

if (args.version) {
  console.info(pkg.version);
  exit();
}

const cmds: Record<string, [number, number]> = {
  login: [2, 2],
  logout: [0, 0],
  get: [2, 2],
  set: [3, 4],
  add: [3, 4],
  del: [2, 2],
};

const [cmd, ...params] = args._;
const paramLengthOkay = cmd && cmds[cmd] && (params.length >= cmds[cmd][0] && params.length <= cmds[cmd][1]);
if (!cmd || args.help || !Object.keys(cmds).includes(cmd) || !paramLengthOkay) {
  console.info(`usage: cfdns [options] command [args]

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
    $ cfdns del example.com a`);
  exit();
}

let email: string, key: string;

/** Perform an authenticated request against the Cloudflare API and return its `result`. */
async function req(method: string, path: string, body?: unknown) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/${path}`, {
    method: method.toUpperCase(),
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Email": email,
      "X-Auth-Key": key,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${JSON.stringify(json)}`);
  }
  return json.result;
}

interface Zone {
  id: string;
  name: string;
}

interface DnsRecord {
  id: string;
  content: string;
  ttl: number;
  proxied: boolean;
}

const rcfile = join(homedir(), ".cfdnsrc");

if (cmd === "login" || cmd === "logout") {
  if (cmd === "login") {
    [email, key] = params;
    await writeFile(rcfile, JSON.stringify({email, key}));
    await chmod(rcfile, 0o600);
    console.info("login data saved");
  } else {
    try {
      await unlink(rcfile);
      console.info("login data deleted");
    } catch {
      console.info("no login data found");
    }
  }
  exit();
} else {
  try {
    ({email, key} = JSON.parse(await readFile(rcfile, "utf8")));
  } catch {
    exit("login data not found, please log in first.");
  }
}

if (params[1]) params[1] = params[1].toUpperCase();
let [name, type, content, ttl] = params as [string, string, string, string | number];
if (!ttl) ttl = 120;
if (typeof ttl === "string") ttl = Number(ttl);
const zones: Array<Zone> = await req("get", "zones");
const zone = zones.find(zone => name.endsWith(zone.name));
if (!zone) exit("no matching zone found");

const record: DnsRecord | undefined = (await req("get", `zones/${zone!.id}/dns_records?name=${name}&type=${type}`))[0];
if (cmd === "get") {
  console.info(record);
} else if (cmd === "set" || cmd === "add") {
  if (record) {
    if (content !== record.content || ttl !== record.ttl) {
      await req("put", `zones/${zone!.id}/dns_records/${record.id}`, {
        name, type, content, ttl, proxied: record.proxied,
      });
      console.info(`updated ${chalk.magenta(name)} ${ttl} IN ${type} ${chalk.green(content)}`);
    } else {
      console.info(`${chalk.magenta(name)} is up to date`);
    }
  } else {
    await req("post", `zones/${zone!.id}/dns_records`, {
      name, type, content, ttl, proxied: false,
    });
    console.info(`created ${chalk.magenta(name)} ${ttl} IN ${type} ${chalk.green(content)}`);
  }
} else if (cmd === "del" && record) {
  await req("delete", `zones/${zone!.id}/dns_records/${record.id}`);
  console.info(`deleted ${chalk.magenta(name)} ${record.ttl} IN ${type} ${chalk.green(record.content)}`);
}
exit();
