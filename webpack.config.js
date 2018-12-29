var webpack = require('webpack')
var path    = require('path')
var fs      = require('fs')
// var CompressionPlugin = require("compression-webpack-plugin")

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
            // entries[name] = [filePath, 'webpack-hot-middleware/client?reload=true'];
            entries[name] = [filePath];
        }
    }
    return entries;
}

var ENTRY = process.env.ENTRY;
var entry = {};
if (ENTRY) {
    // entry[ENTRY] = ['./demo/' + ENTRY + '.js', 'webpack-hot-middleware/client?reload=true'];
    entry[ENTRY] = ['./demo/' + ENTRY + '.js'];
} else {
    entry = getDemoEntry(path.resolve(__dirname, 'demo/'));
}

var devtool, output, mode;

if (process.env.NODE_ENV === 'production') {
    console.log("publishing");

    entry = {
        Timeline: [path.resolve("./src/index.js")],
    };

    devtool = undefined;

	output = {
        path: path.resolve("./dist"),
        publicPath: "/", // 为使内网可访问, 不指明host
        filename: "[name].js",
        libraryTarget: 'umd',
        umdNamedDefine: true,
        globalObject: "this",
    };

    mode = 'production';
    // devtool = "inline-source-map";
    // mode = 'development';

} else {
    console.log("deving");

	devtool = "inline-source-map";

	output = {
		filename: '[name].demo.js',
		publicPath: '/static/',
	};

    mode = 'development';
}


var config = {
    entry: entry,
    output: output,
    devtool: devtool,
    plugins: [
        new webpack.NoEmitOnErrorsPlugin(), // 出错时不发布
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
