// 默认配置
const CONFIG_DEFAULT = {
	duration: Infinity,
	loop: false,
};

export default class TrackGroup {
	constructor(config) {
		this.config = {
			...CONFIG_DEFAULT,
			...config,
		};

		this.isTrackGroup = true
		// 子级Track
		this.tracks = [];
		this.currentTime = 0; // timeLocal
		this.duration = this.config.duration;
	}

	// 垃圾回收
	recovery() {
		// 倒序删除，以免数组索引混乱
		for (let i = this.tracks.length - 1; i >= 0; i--) {
			if (!this.tracks[i].alive) {
				this.tracks.splice(i, 1);
			}
		}
	}

	/**
	 * 根据配置创建一个Track
	 * @param {Object} props 配置项，详见Track.constructor
	 * @return {Track} 所创建的Track
	 */
	addTrack(props) {return this.add(props);}
	add(props) {
		if (props.isTimeline) {
			props.tracks.push(props)
			props.parent = this;
			props.onInit && props.onInit(this.currentTime);
			return props;
		} else if (props.isTrack) {
			const track = props;
			track._safeClip(this.duration);
			if (track.parent) {
				track.parent.remove(track);
			}
			track.parent = this;
			track.onInit && track.onInit(this.currentTime);
			this.tracks.push(track);
			return track;
		} else {
			const track = new Track(props);
			track._safeClip(this.duration);
			track.parent = this;
			track.onInit && track.onInit(this.currentTime);
			this.tracks.push(track);
			return track;
		}
	}

	/**
	 * 根据ID获取Tracks
	 * @param  {Number} id
	 * @return {Array(Track)}
	 */
	getTracksByID(id) {
		const tracks = [];
		for (let i = 0; i < this.tracks.length; i++) {
			if (this.tracks[i].id === id) {
				tracks.push(this.tracks[i])
			}
		}
		return tracks;
	}

	clear() {
		this.tracks = [];
	}
}
