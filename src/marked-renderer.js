import { Renderer } from 'marked';

// https://github.com/markedjs/marked/issues/1538#issuecomment-1193178819

/**
 * @param {String} expression
 * @returns {[String, String]}
 */
const handleExpression = expression => expression
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', '\'')
    .replace(/&#x([\da-f]+);/gi, (_, m) => String.fromCharCode(parseInt(m, 16)))
    .replace(/&#(\d+);/gi, (_, m) => String.fromCharCode(parseInt(m, 10)))
    .replace(/\\\s+/g, '\\\\ ');

const renderer = {};

// Alternatives:
// https://www.zhihu.com/equation?tex={}
// https://math.jianshu.com/math?formula={}
// https://math.vercel.app/?from={}
// https://latex.codecogs.com/svg?{}
// https://i.upmath.me/svg/{}
const mathRenderer = text => text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, /** @type {String} */ expression) => `<p style="text-align:center"><img class="math" src="https://i.upmath.me/svg/${encodeURIComponent(handleExpression(expression))}" alt="${expression}" referrerpolicy="no-referrer"></p>`)
    .replace(/\$([^\n]+?)\$/g, (_, /** @type {String} */ expression) => `<img class="math" style="vertical-align:middle" src="https://i.upmath.me/svg/${encodeURIComponent(handleExpression(expression))}" alt="${expression}" referrerpolicy="no-referrer">`);

['listitem', 'paragraph', 'tablecell', 'text'].forEach(type => {
    renderer[type] = function (...args) {
        args[0] = mathRenderer(args[0]);
        return Renderer.prototype[type].apply(this, args);
    };
});

renderer.code = function (...args) {
    return Renderer.prototype.code.apply(this, args).replace(/^<pre><code/, '<pre class="line-numbers"><code');
};

export default renderer;
