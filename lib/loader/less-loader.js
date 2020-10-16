let less = require('less');
function loader(souce) {
    let css = '';
    less.render(souce, (err, c) => {
        css = c.css;
    });
    css = css.replace(/\n/g, '\\n'); // 将less中的 \n 替换成 \\n
    return css;
}
module.exports = loader;