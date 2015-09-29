import fs from 'fs';
import ProgressBar from 'progress';
import yargs from 'yargs';
import https from 'https';
import mkdirp from 'mkdirp';

const WORKERS_MAX = 10;

let argv = yargs
  .usage('Usage: $0 --access-token <token> --outdir <directory>')
  .demand(['access-token'])
  .default('outdir', 'moments')
  .argv;

const ACCESS_TOKEN = argv['access-token'];
const OUTDIR = argv['outdir'];

if (!fs.existsSync(OUTDIR)) {
  mkdirp.sync(OUTDIR);
}

console.log(`Using access token = ${ACCESS_TOKEN}`);
console.log(`Downloading moments to '${OUTDIR}'`);

getMoments().then(function(moments) {
  console.log(`Fetching ${moments.length} moments...`);
  return downloadAllMoments(moments);
}).then(function(progress) {
  console.log(`Downloaded ${progress.downloaded}, skipped ${progress.skipped}, had ${progress.errors} problems`);
}).catch(function(err) {
  console.error('Oops!', err, err.stack);
});

function getMoments() {
  return new Promise(function(resolve, reject) {
    let req = https.request({
      hostname: 'cmd.thislife.com',
      port: 443,
      path: '/json',
      method: 'POST',
      headers: {
        'Content-type': 'application/x-www-form-urlencoded'
      }
    }, function(res) {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to get moments: ${res.statusCode}`));
        return;
      }

      let bufs = [];
      res.on('data', function(d) {
        bufs.push(d);
      });

      res.on('end', function() {
        let data = Buffer.concat(bufs).toString();
        try {
          resolve(JSON.parse(data).result.payload.moments);
        } catch(e) {
          reject(new Error('Failed to parse response: ' + data));
        }
      })
    });

    req.end(`{"method":"searchMoments","params":["${ACCESS_TOKEN}","50000087695",true,false,false,false,false,false,true,false,false,false,false,false,false],"headers":{"X-SFLY-SubSource":"library"},"id":null}`);
  });
}

function downloadMoment(moment) {
  let path = `${OUTDIR}/${moment}`;
  if (fs.existsSync(path)) {
    return Promise.resolve(false);
  }

  let url = `https://io.thislife.com/download?accessToken=${ACCESS_TOKEN}&momentId=${moment}&source=FMV`;
  return new Promise(function(resolve, reject) {
    https.get(url, function(res) {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed: ${moment}, status code ${res.statusCode}`));
        return;
      }

      let output = fs.createWriteStream(path, { flags: 'w+', defaultEncoding: 'binary' });
      let downloadError = null;
      res.on('data', function(d) {
        output.write(d);
      });

      res.on('error', function(e) {
        downloadError = new Error(`Download error for ${moment}: ` + e);
      });

      res.on('end', function() {
        output.end();

        if (downloadError) {
          fs.unlink(path);
          reject(downloadError);
        } else {
          resolve(true);
        }
      })
    });
  });
}

function downloadAllMoments(moments) {
  let bar = new ProgressBar(':bar [:current / :total, :percent%], ETA :etas', {
    total: moments.length,
    width: 60
  });
  return new Promise(function(resolve) {
    let numWorkers = 0;
    let progress = {
      total: moments.length,
      downloaded: 0,
      skipped: 0,
      errors: 0
    }

    let doWork = function() {
      if (moments.length == 0) {
        numWorkers--;
        if (numWorkers === 0) {
          resolve(progress);
        }
        return;
      }

      downloadMoment(moments.shift()).then(function(downloaded) {
        if (downloaded) {
          progress.downloaded++
        } else {
          progress.skipped++;
        }
        bar.tick();
        doWork();
      }).catch(function(err) {
        console.error(err);
        progress.errors++;
        bar.tick();
        doWork();
      });
    }

    while (numWorkers < Math.min(moments.length, WORKERS_MAX)) {
      numWorkers++;
      doWork();
    }
  });
}
