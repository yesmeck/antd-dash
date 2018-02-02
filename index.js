const path = require('path');
const fs = require('fs');
const cheerio = require('cheerio');
const { execSync } = require('child_process');
const glob = require('glob');
const debug = require('debug')('antd-dash');

const sitePath = path.join(process.cwd(), 'ant-design', '_site');
const docsetPath = path.join(process.cwd(), 'ant-design.docset');
const contentsPath = path.join(docsetPath, 'Contents');
const resoucesPath = path.join(contentsPath, 'Resources');
const documentsPath = path.join(resoucesPath, 'Documents');
const dbPath = path.join(resoucesPath, 'docSet.dsidx');
const plistPath = path.join(contentsPath, 'Info.plist');

/****************************** help methods **********************************/
function query(sql) {
  execSync(`echo "${sql}" | sqlite3 ${dbPath}`);
}

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function classify(string) {
  return string.split('-').map(capitalize).join('');
}

function generateRecords() {
  debug(`Generate records.`);
  let $query;
  // Guide
  const guide =fs.readFileSync(path.join(documentsPath, 'docs', 'spec', 'introduce.html')).toString();
  $query = cheerio.load(guide);
  $query('.aside-container .ant-menu-item').each((i, item) => {
    const name = $query(item).text();
    const path = $query(item).find('a').attr('href') + '.html';
    query(`INSERT OR IGNORE INTO searchIndex(name, type, path) VALUES ('${name}', 'Section', '${path}');`)
  });

  // Components
  const component =fs.readFileSync(path.join(documentsPath, 'docs', 'react', 'introduce.html')).toString();
  $query = cheerio.load(component);
  $query('.aside-container .ant-menu-submenu .ant-menu-item').each((i, item) => {
    const name = $query(item).text();
    const path = $query(item).find('a').attr('href');
    query(`INSERT OR IGNORE INTO searchIndex(name, type, path) VALUES ('${name}', 'Component', '${path}');`)
  });

  $query('.aside-container > .ant-menu-item').each((i, item) => {
    const name = $query(item).text();
    const path = $query(item).find('a').attr('href') + '.html';
    query(`INSERT OR IGNORE INTO searchIndex(name, type, path) VALUES ('${name}', 'Guide', '${path}');`)
  });
}
/******************************************************************************/

function clean() {
  debug(`Clean ${docsetPath}.`);
  execSync(`rm -rf ${docsetPath}`);
}

function createFolder() {
  debug(`Create ${docsetPath}.`);
  execSync(`mkdir -p ${resoucesPath}`);
  execSync(`cp icon.png ${docsetPath}`);
}

function patchBisheng() {
  debug('Patch bisheng.');
}

function buildSite() {
  debug('Build site.');
  execSync(`cd ant-design && npm install --no-package-lock && npm run site`);
}

function copyHTML() {
  debug('Copy html files.');
  execSync(`cp -r ${sitePath} ${documentsPath}`);
}

function fixStaticPath() {
  debug('Fix static path.');
  execSync(`perl -pi -e 's#components/:children/#components/:children/index.html#' ${documentsPath}/index.js`);
  execSync(`perl -pi -e 's#"path":"changelog"#"path":"changelog.html"#' ${documentsPath}/index.js`);
  const commands = [
    `for dir in $(find ${documentsPath} -type d ! -path ${documentsPath} | uniq); `,
    `do for file in $(find ${documentsPath} \\( -name '*.js' -o -name '*.css' \\) -d 1); `,
    `do cp $file $dir; `,
    'done; ',
    'done'
  ]
  execSync(commands.join(''));
  execSync(`find ${documentsPath} -name '*.html' | xargs perl -pi -e 's#href="/#href="./#'`);
  execSync(`find ${documentsPath} -name '*.html' | xargs perl -pi -e 's#src="/#src="./#'`);
}

function createDb() {
  debug('Create db.');
  query('CREATE TABLE searchIndex(id INTEGER PRIMARY KEY, name TEXT, type TEXT, path TEXT);');
  query('CREATE UNIQUE INDEX anchor ON searchIndex (name, type, path);')
}

function createPlist() {
  debug('Create plist.');
  execSync(`
    cat << EOF > ${plistPath}
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>antd</string>
  <key>CFBundleName</key>
  <string>Ant Design</string>
  <key>DocSetPlatformFamily</key>
  <string>antd</string>
  <key>isDashDocset</key>
  <true/>
  <key>isJavaScriptEnabled</key>
  <true/>
</dict>
</plist>
EOF
  `);
}

function main() {
  patchBisheng();
  buildSite();
  clean();
  createFolder();
  copyHTML();
  fixStaticPath();
  createPlist();
  createDb();
  generateRecords();
}

main();
