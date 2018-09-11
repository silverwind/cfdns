#!/usr/bin/env node
"use strict";

const args = require("minimist")(process.argv.slice(2), {
  boolean: ["v", "version", "h", "help"],
  alias: {v: "version", h: "help"},
});

function exit(err) {
  if (err) console.info(`Error: ${err}`);
  process.exit(err ? 1 : 0);
}

if (args.version) {
  console.info(require("./package.json").version);
  exit();
}

const cmds = {
  login: 2,
  logout: 0,
  get: 2,
  update: 4,
  delete: 2,
};

const [cmd, ...params] = args._;
if (!cmd || args.help || !Object.keys(cmds).includes(cmd) || params.length !== cmds[cmd]) {
  console.info(`usage: cfdns [options] command [args]

  Commands:
    login <email> <key>                 Log in to the API
    get <name> <type>                   Retrieve a DNS record
    set <name> <type> <value> [<ttl>]   Create or update a DNS record
    del <name> <type>                   Delete a DNS record
    logout                              Log out from the API

  Options:
    -v, --version                       Print the version
    -h, --help                          Print this help

  Example:
    $ cfdns login user@example.com 4c689aa3462a44a121c1f199c1081240b9be4
    $ cfdns set example.com a 1.2.3.4 120
    $ cfdns get example.com a
    $ cfdns del example.com a`);
  exit();
}

const request = require("request-promise-native");
let email, key;

async function req(method, path, body) {
  return (await request({
    method: method.toUpperCase(),
    json: true,
    uri: `https://api.cloudflare.com/client/v4/${path}`,
    headers: {
      "X-Auth-Email": email,
      "X-Auth-Key": key,
    },
    body,
  })).result;
}

(async () => {
  const fs = require("fs-extra");
  const rcfile = require("path").join(require("os").homedir(), ".cfdnsrc");

  if (cmd === "login" || cmd === "logout") {
    if (cmd === "login") {
      [email, key] = params;
      await fs.writeFile(rcfile, JSON.stringify({email, key}));
      await fs.chmod(rcfile, 0o600);
      console.info("Login data saved");
    } else {
      try {
        await fs.unlink(rcfile);
        console.info("Login data deleted");
      } catch (err) {
        console.info("No login data found");
      }
    }
    exit();
  } else {
    try {
      ({email, key} = JSON.parse(await fs.readFile(rcfile)));
    } catch (err) {
      exit("Login data not found, please log in first.");
    }
  }

  if (params[1]) params[1] = params[1].toUpperCase();
  let [name, type, content, ttl] = params;
  if (!ttl) ttl = 120;
  const zones = await req("get", "zones");
  const zone = zones.find(zone => name.endsWith(zone.name));
  if (!zone) exit("No matching zone found");

  const record = (await req("get", `zones/${zone.id}/dns_records?name=${name}&type=${type}`))[0];
  if (cmd === "get") {
    console.info(record);
  } else if (cmd === "set" || cmd === "add") {
    if (record) {
      if (content !== record.content || ttl !== record.ttl) {
        await req("put", `zones/${zone.id}/dns_records/${record.id}`, {
          name, type, content, ttl, proxied: record.proxied
        });
        console.info(`Updated ${name} ${ttl} IN ${type} ${content}`);
      } else {
        console.info(`${name} is up to date`);
      }
    } else {
      await req("post", `zones/${zone.id}/dns_records`, {
        name, type, content, ttl, proxied: false
      });
      console.info(`Created ${name} ${ttl} IN ${type} ${content}`);
    }
  } else if (cmd === "del") {
    if (record) {
      await req("delete", `zones/${zone.id}/dns_records/${record.id}`);
      console.info(`Deleted ${name} ${record.ttl} IN ${type} ${record.content}`);
    }
  }
  exit();
})();
