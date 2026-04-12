module.exports = {
  apps : [{
    name: "server",
    script: './server.js',
    watch: true,
    ignore_watch: [
        "dump",
        "dump/*",
        "backups",
        "backups/*",
        "node_modules"
      ]
  }]
};
