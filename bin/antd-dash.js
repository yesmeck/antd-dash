#!/usr/bin/env node

const path = require('path');
const getConfig = require('bisheng/lib/utils/get-config');
const markdownData = require('bisheng/lib/utils/markdown-data');
const execSync = require('child_process').execSync

const config = getConfig(path.join(process.cwd(), 'site', 'bisheng.config.js'));
const markdown = markdownData.generate(config.source);

const sitePath = path.join(process.cwd(), '_site');
const docsetPath = path.join(process.cwd(), 'antd.docset');
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


function indexComponents(markdown, index = {}) {
  Object.keys(markdown).map(name => {
    const component = classify(name);
    query(`INSERT OR IGNORE INTO searchIndex(name, type, path) VALUES ('${component}', 'Component', '/components/${name}/');`)
  })
}
/******************************************************************************/

function clean() {
  execSync(`rm -rf ${docsetPath}`);
}

function createFolder() {
  execSync(`mkdir -p ${resoucesPath}`);
}

function copyHTML() {
  execSync(`cp -r ${sitePath} ${documentsPath}`);
}

function fixStaticPath() {
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

function injectBasename() {
  const script = "<script>window.__basename = window.location.pathname.split(\"/\").slice(0, 3).join(\"/\");</script>";
  execSync(`find ${documentsPath} -name '*.html' | xargs perl -pi -e '$_ .= qq(${script}\n) if /<title>/'`);
}

function createDb() {
  query('CREATE TABLE searchIndex(id INTEGER PRIMARY KEY, name TEXT, type TEXT, path TEXT);');
  query('CREATE UNIQUE INDEX anchor ON searchIndex (name, type, path);')
}

function createPlist() {
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

clean();
createFolder();
copyHTML();
fixStaticPath();
injectBasename()
createPlist();
createDb();
indexComponents(markdown.components);
