const webpack = require('webpack')
const path = require('path')

process.noDeprecation = true

var config = {
	entry: {
		umd: [path.resolve('./dist/global.js')],
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
	devtool: 'source-map', // 把sourcemap作为单独的文件发布上去
	plugins: [
		new webpack.DefinePlugin({
			'process.env': {
				NODE_ENV: JSON.stringify('production'),
			},
		}),
		new webpack.NoEmitOnErrorsPlugin(), // 出错时不发布
	],
	resolve: {
		extensions: ['.js'],
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				// include: /dist/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: ['@babel/preset-env'],
					},
				},
			},
		],
	},
}

module.exports = config
