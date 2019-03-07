/**
 * Copyright(c) 2017 Alibaba Group Holding Limited
 * @author Simon
 */

const webpack = require('webpack');
const path    = require('path');
const fs      = require('fs');

process.noDeprecation = true;

function getDemoEntry(dirPath) {
    var entries = {};
    var reg = /.js$/;
    var pageDir = fs.readdirSync(dirPath) || [];

    for (var j = 0; j < pageDir.length; j++) {
        var filePath = path.resolve(dirPath, pageDir[j]);
        var fileStat = fs.statSync(filePath);
        if (fileStat.isFile() && reg.test(pageDir[j])) {
            var name = pageDir[j].replace('.js', '');
            entries[name] = [filePath];
        }
    }
    return entries;
}

const ENTRY = process.env.ENTRY;
let entry = {};
if (ENTRY) {
    entry[ENTRY] = ['./demo/' + ENTRY + '.js'];
} else {
    entry = getDemoEntry(path.resolve(__dirname, 'demo/'));
}

let devtool, output, mode;

if (process.env.NODE_ENV === 'production') {
    console.log("publishing");

    entry = {
        Timeline: [path.resolve("./src/index.js")],
    };

    devtool = 'source-map'; // 把sourcemap作为单独的文件发布上去

	output = {
        path: path.resolve("./dist"),
        publicPath: "/", // 为使内网可访问, 不指明host
        filename: "[name].js",
        libraryTarget: 'umd',
        umdNamedDefine: true,
        globalObject: "this",
    };

    mode = 'production';

} else {
    console.log("developing");

	devtool = "inline-source-map";

	output = {
		filename: '[name].demo.js',
		publicPath: '/static/',
	};

    mode = 'development';
}


const config = {
    entry: entry,
    output: output,
    devtool: devtool,
    plugins: [
        new webpack.NoEmitOnErrorsPlugin(), // 出错时不发布
		new webpack.DefinePlugin({
			VERSION: JSON.stringify(require("./package.json").version)
		}),
    ],
    mode: mode,
	resolve: {
	  alias: {
		src: path.join(__dirname, 'src'),
	  },
	  extensions: ['.js', '.scss', '.css'],
	},
    module: {
        rules: [
            {
                test: /\.js$/,
                include: /src|demo/,
                loader: 'babel-loader',
                options: {
                    cacheDirectory: true,
                    presets: ['@babel/preset-env'],
                    plugins: ['@babel/plugin-proposal-object-rest-spread'],
                }
            }
        ]
    },
}

module.exports = config;
