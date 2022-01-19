/**
 * Copyright (c) 2022 Alibaba Group Holding Limited
 * @author Simon<gaomeng1900@gmail.com>
 * @description TrackGroup
 */

import { isTrack, Track, TrackOptions } from './Track'

export class TrackGroup {
	readonly isTrackGroup = true

	/**
	 * tracks in the group
	 * @note do not keep this reference, may change anytime
	 */
	protected tracks = [] as Array<Track>

	/**
	 * release dead tracks
	 * @deprecated renamed as {@link release}
	 * @alias {@link dispose}
	 */
	protected recovery() {
		this.release()
	}

	/**
	 * dispose dead tracks
	 * @note .alive is set by user, or expired
	 */
	protected release() {
		this.tracks = this.tracks.filter((track) => track.alive && !track.expired)
	}

	/**
	 * Add a track
	 *
	 * 根据配置创建一个Track
	 */
	addTrack(track: Track | TrackOptions) {
		return this.add(track)
	}
	add(track: Track | TrackOptions) {
		if (isTrack(track)) {
			if (track.parent) {
				// change parent
				track.parent.remove(track)
			}
			track.parent = this
			// track.onInit && track.onInit(this.currentTime);
			this.tracks.push(track)
			return track
		} else {
			const _track = new Track(track)
			_track.parent = this
			// track.onInit && track.onInit(this.currentTime);
			this.tracks.push(_track)
			return _track
		}
	}

	/**
	 * Get all tracks that has a certain .id
	 *
	 * 根据ID获取Tracks
	 */
	getTracksByID(id: Track['id']) {
		const tracks = [] as Track[]
		for (let i = 0; i < this.tracks.length; i++) {
			if (this.tracks[i].id === id) {
				tracks.push(this.tracks[i])
			}
		}
		return tracks
	}

	/**
	 * Stop a track
	 *
	 * 停止一个track，并标记这个track可被清理
	 */
	stopTrack(track: Track) {
		track.alive = false
	}

	/**
	 * Remove a track
	 */
	remove(track: Track) {
		for (let i = this.tracks.length - 1; i >= 0; i--) {
			if (track === this.tracks[i]) {
				this.tracks.splice(i, 1)
			}
		}
	}

	/**
	 * @deprecated renamed as removeAll
	 */
	clear() {
		this.removeAll()
	}
	removeAll() {
		this.tracks = []
	}
}

export function isTrackGroup(trackGroup: any): trackGroup is TrackGroup {
	return trackGroup.isTrackGroup
}
