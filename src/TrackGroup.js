/**
 * Copyright (c) 2017 Alibaba Group Holding Limited
 * @author Simon(Meng) / gaomeng1900 @gmail.com
 */

import Track from './Track'

// 默认配置
const CONFIG_DEFAULT = {
	duration: Infinity,
	loop: false,
}

export default class TrackGroup extends Track {
	constructor(config) {
		config = {
			...CONFIG_DEFAULT,
			...config,
		}

		super(config)

		this.config = config

		this.isTrackGroup = true
		// 子级Track
		this.tracks = []
	}

	// traverse(f) {
	// 	// 自己
	// 	f(this)
	// 	// children
	// 	if (!this.tracks || this.tracks.length === 0) return
	// 	this.tracks.forEach(c => c.traverse(f))
	// }

	// 垃圾回收
	recovery() {
		// @NOTE 性能过差
		// 倒序删除，以免数组索引混乱
		// for (let i = this.tracks.length - 1; i >= 0; i--) {
		// 	if (!this.tracks[i].alive) {
		// 		this.tracks.splice(i, 1);
		// 	}
		// }

		// @NOTE 外部不应该保存tracks引用
		this.tracks = this.tracks.filter((track) => track.alive)
	}

	/**
	 * 根据配置创建一个Track
	 * @param {Object} props 配置项，详见Track.constructor
	 * @return {Track} 所创建的Track
	 */
	addTrack(props) {
		return this.add(props)
	}
	add(props) {
		// @TODO 子级timeline待测试
		if (props.isTimeline) {
			props.tracks.push(props)
			props.parent = this
			// props.onInit && props.onInit(this.currentTime);
			return props
		} else if (props.isTrack) {
			const track = props
			// track._safeClip(this.duration);
			if (track.parent) {
				track.parent.remove(track)
			}
			track.parent = this
			// track.onInit && track.onInit(this.currentTime);
			this.tracks.push(track)
			return track
		} else {
			const track = new Track(props)
			// track._safeClip(this.duration);
			track.parent = this
			// track.onInit && track.onInit(this.currentTime);
			this.tracks.push(track)
			return track
		}
	}

	/**
	 * 根据ID获取Tracks
	 * @param  {Number} id
	 * @return {Array(Track)}
	 */
	getTracksByID(id) {
		const tracks = []
		for (let i = 0; i < this.tracks.length; i++) {
			if (this.tracks[i].id === id) {
				tracks.push(this.tracks[i])
			}
		}
		return tracks
	}

	/**
	 * 停止一个track，并标记这个track可被清理
	 * @param {Track} track
	 */
	stopTrack(track) {
		track.alive = false
	}

	clear() {
		this.tracks = []
	}
}
