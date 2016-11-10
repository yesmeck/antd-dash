#!/usr/bin/env node

const path = require('path');
const getConfig = require('bisheng/lib/utils/get-config');
const markdownData = require('bisheng/lib/utils/markdown-data');
const generateFilesPath = require('bisheng/lib/utils/generate-files-path');

const projectPath = path.resolve(__dirname, '../../..')
const config = getConfig(path.join(projectPath, 'site', 'bisheng.config.js'));
const markdown = markdownData.generate(config.source);

console.log(markdown.components.affix);

Object.keys(markdown.components).map(component => {
  console.log(component);
})



