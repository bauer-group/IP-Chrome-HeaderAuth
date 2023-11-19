import * as fs from 'fs';
import * as archiver from 'archiver';

// Read the version from package.json
const manifestJson = JSON.parse(fs.readFileSync('./dist/manifest.json', 'utf8'));
const version = manifestJson.version;

// Create a zip file name with the version number
const zipFileName = `./dist-zip/bauergroup-header-authenticator_v${version}.zip`;

// Create a stream to write files to the zip file
const output = fs.createWriteStream(zipFileName);
const archive = archiver('zip', { zlib: { level: 9 }});

// Listen for the 'close' event on the stream
output.on('close', function() {
  console.log('ZIP file with ' + archive.pointer() + ' total bytes created');
  console.log('Archiver has been finalized and the output file descriptor has closed.');
});

// Pipe the archive data to the file
archive.pipe(output);

// Append files from the 'dist' directory
archive.directory('dist/', false);

// Finalize the archive
archive.finalize();
