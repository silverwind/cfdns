#!/usr/bin/env node
import {parseArgs, styleText, type ParseArgsConfig} from "node:util";
import {join} from "node:path";
import {homedir} from "node:os";
import {readFile, writeFile, chmod, unlink} from "node:fs/promises";
import {argv, exit as processExit} from "node:process";
import pkg from "./package.json" with {type: "json"};

function parseArgv<T extends ParseArgsConfig>(config: T): ReturnType<typeof parseArgs<T>> {
  try {
    return parseArgs(config);
  } catch (err) {
    return exit((err as Error).message);
  }
}

const {values: args, positionals} = parseArgv({
  args: argv.slice(2),
  options: {
    color: {type: "boolean", short: "c"},
    help: {type: "boolean", short: "h"},
    "no-color": {type: "boolean", short: "n"},
    version: {type: "boolean", short: "v"},
  },
  allowPositionals: true,
  strict: true,
});

function color(format: Parameters<typeof styleText>[0], text: string): string {
  return args["no-color"] ? text : styleText(format, text, {validateStream: !args.color});
}

function exit(err?: string): never {
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

const [cmd, ...params] = positionals;
const paramLengthOkay = cmd && cmds[cmd] && params.length >= cmds[cmd][0] && params.length <= cmds[cmd][1];
if (args.help || !paramLengthOkay) {
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

async function req(method: string, path: string, body?: unknown) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Email": email,
      "X-Auth-Key": key,
    },
    body: JSON.stringify(body),
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

const [name, rawType, content, rawTtl] = params;
const type = rawType.toUpperCase();
const ttl = rawTtl ? Number(rawTtl) : 120;
let zone: Zone | undefined;
for (let page = 1; !zone; page++) {
  const zones: Array<Zone> = await req("GET", `zones?per_page=50&page=${page}`);
  zone = zones.find(zone => name === zone.name || name.endsWith(`.${zone.name}`));
  if (zones.length < 50) break;
}
if (!zone) exit("no matching zone found");

const record: DnsRecord | undefined = (await req("GET", `zones/${zone.id}/dns_records?name=${name}&type=${type}`))[0];
if (cmd === "get") {
  console.info(record);
} else if (cmd === "set" || cmd === "add") {
  if (record) {
    if (content !== record.content || ttl !== record.ttl) {
      await req("PUT", `zones/${zone.id}/dns_records/${record.id}`, {
        name, type, content, ttl, proxied: record.proxied,
      });
      console.info(`updated ${color("magenta", name)} ${ttl} IN ${type} ${color("green", content)}`);
    } else {
      console.info(`${color("magenta", name)} is up to date`);
    }
  } else {
    await req("POST", `zones/${zone.id}/dns_records`, {
      name, type, content, ttl, proxied: false,
    });
    console.info(`created ${color("magenta", name)} ${ttl} IN ${type} ${color("green", content)}`);
  }
} else if (cmd === "del" && record) {
  await req("DELETE", `zones/${zone.id}/dns_records/${record.id}`);
  console.info(`deleted ${color("magenta", name)} ${record.ttl} IN ${type} ${color("green", record.content)}`);
}
exit();
