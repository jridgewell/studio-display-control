/* eslint-env node */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getBrightness, setBrightness } = require(`${__dirname}/..`);

(async () => {
  const args = process.argv.slice(2);
  switch (args[0]) {
    case 'get': {
      const b = await getBrightness();
      console.log(`Brightness set to ${b}%`);
      return;
    }
    case 'set': {
      const p = parseInt(args[1], 10);
      if (!Number.isNaN(p)) {
        await setBrightness(p);
        return;
      }
    }
  }

  console.error(`\
Usage: asdctl get
       asdctl set {percent}\
`);
  process.exit(1);
})();
