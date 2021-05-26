'use strict';
const path = require('path');
const fs = require('fs');
const css = require('css');
const camel = require('to-camel-case');
const autogenMessage =
  '//\n// This file has been auto-generated by the `npm run build-styles-prism` task\n//\n\n';

let directories = [
  '../node_modules/prismjs/themes',
  '../node_modules/prism-themes/themes'
];

directories.map(directory => {
  fs.readdir(path.join(__dirname, directory), (err, files) => {
    files.forEach(file => {
      if (file.includes('.css')) {
        createJavascriptStyleSheet(file, directory);
      }
    });
    updateDocs(files);
  });
});

let allFiles = [];
let callCount = 0;
function updateDocs(files) {
  allFiles = allFiles.concat(files);
  callCount += 1;

  if (callCount != directories.length) {
    return;
  }
  const onlyCSSFiles = allFiles.filter(file => file.includes('.css'));
  const availableStyleNames = onlyCSSFiles.map(file =>
    file === 'prism.css' ? 'prism' : file.split('.css')[0].split('prism-')[1]
  );
  const styles = availableStyleNames.map(name => `\n* ${camel(name)}`);
  const defaultExports = availableStyleNames.map(
    name => `export { default as ${camel(name)} } from './${name}';\n`
  );
  const styleMD = `## Available \`stylesheet\` props ${styles.join('')}`;
  fs.writeFile(
    path.join(__dirname, '../AVAILABLE_STYLES_PRISM.MD'),
    styleMD,
    () => {}
  );
  fs.writeFile(
    path.join(__dirname, '../src/styles/prism/index.js'),
    defaultExports.join(''),
    () => {}
  );

  const demoStylesArray = `${autogenMessage}export default [${availableStyleNames
    .sort()
    .map(style => `\n  '${style}'`)}\n];`;
  fs.writeFile(
    path.join(__dirname, '../demo/styles/prism.js'),
    demoStylesArray,
    err => {
      if (err) {
        throw err;
      }
    }
  );
}

function createJavascriptStyleSheet(file, directory) {
  const fileWithoutCSS =
    file === 'prism.css' ? 'prism' : file.split('.css')[0].split('prism-')[1];
  console.log(fileWithoutCSS);
  fs.readFile(
    path.join(__dirname, `${directory}/${file}`),
    'utf-8',
    (err, data) => {
      const javacriptStylesheet = css
        .parse(data)
        .stylesheet.rules.reduce((sheet, rule) => {
          if (rule.type === 'rule') {
            const style = rule.selectors.reduce((selectors, selector) => {
              const selectorObject = rule.declarations.reduce(
                (declarations, declaration) => {
                  if (
                    declaration.type === 'declaration' &&
                    declaration.property
                  ) {
                    const camelCaseDeclarationProp = camel(
                      declaration.property
                    );
                    const key =
                      camelCaseDeclarationProp.includes('moz') ||
                      camelCaseDeclarationProp.includes('webkit') ||
                      (camelCaseDeclarationProp[0] === 'o' &&
                        !camelCaseDeclarationProp.includes('overflow'))
                        ? `${camelCaseDeclarationProp
                            .substring(0, 1)
                            .toUpperCase()}${camelCaseDeclarationProp.substring(
                            1
                          )}`
                        : camelCaseDeclarationProp;
                    declarations[key] = declaration.value;
                  }
                  return declarations;
                },
                {}
              );

              if (selector.substring(0, 6) === '.token') {
                selector = selector.substring(7);

                // Regex to fix Prism theme selectors
                // - Remove further `.token` classes
                // - Remove the space (descendant combinator)
                //   to allow for styling multiple classes
                //   Ref: https://github.com/react-syntax-highlighter/react-syntax-highlighter/pull/305
                selector = selector.replace(/(?<=\w) (\.token)?(?=\.)/g, '');
              }
              selectors[selector] = selectorObject;
              return selectors;
            }, {});
            sheet = Object.keys(style).reduce((stylesheet, selector) => {
              if (stylesheet[selector]) {
                stylesheet[selector] = Object.assign(
                  {},
                  stylesheet[selector],
                  style[selector]
                );
              } else {
                stylesheet[selector] = style[selector];
              }
              return stylesheet;
            }, sheet);
          }
          return sheet;
        }, {});
      fs.writeFile(
        path.join(__dirname, `../src/styles/prism/${fileWithoutCSS}.js`),
        `export default ${JSON.stringify(javacriptStylesheet, null, 4)}`,
        () => {}
      );
    }
  );
}