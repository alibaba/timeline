const webpack = require('webpack')
const path = require('path')
const fs = require('fs')
const ProgressBarPlugin = require('progress-bar-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')

process.noDeprecation = true

var config = {
	entry: {
		Timeline: [path.resolve('./src/index.js')],
	},
	output: {
		path: path.resolve('./dist'),
		publicPath: '/', // 为使内网可访问, 不指明host
		filename: '[name].js',
		libraryTarget: 'umd',
		umdNamedDefine: true,
		globalObject: 'this',
	},
	mode: 'production',
	stats: 'normal',
	optimization: {
		minimizer: [
			new TerserPlugin({
				sourceMap: true,
				terserOptions: {
					mangle: false,
					keep_fnames: true,
				},
			}),
		],
	},
	devtool: 'source-map', // 把sourcemap作为单独的文件发布上去
	plugins: [
		new webpack.DefinePlugin({
			'process.env': {
				NODE_ENV: JSON.stringify('production'),
			},
		}),
		new ProgressBarPlugin({ width: 30 }),
		new webpack.NoEmitOnErrorsPlugin(), // 出错时不发布
	],
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
				use: [
					{
						loader: 'babel-loader',
						options: {
							cacheDirectory: true,
							presets: [['@babel/preset-env']],
							plugins: [
								// '@babel/plugin-transform-runtime',
								// '@babel/plugin-proposal-function-bind',
								// ['@babel/plugin-proposal-decorators', { legacy: true }],
								['@babel/plugin-proposal-class-properties', { loose: true }],
								// ['@babel/plugin-proposal-async-generator-functions'],
								// [
								// 	'@babel/plugin-transform-async-to-generator',
								// 	{
								// 		module: 'bluebird',
								// 		method: 'coroutine',
								// 	},
								// ],
							],
						},
					},
				],
			},
		],
	},
}

module.exports = config
