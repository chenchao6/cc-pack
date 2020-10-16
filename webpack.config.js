import path from 'path';

class P {
    apply(compiler) {
        compiler.hooks.emit.tap('emit', () => {
            console.log('emit');
        })
    }
}

export default {
    mode: "development",
    entry: "./src/index.js",
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            {
                test: /\.less$/,
                use: [
                    path.resolve(__dirname, 'lib/loader', 'style-loader'),
                    path.resolve(__dirname, 'lib/loader', 'less-loader'),
                ]
            }
        ]
    },
    plugins: [
        new P()
    ]
}