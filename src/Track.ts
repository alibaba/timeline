/**
 * Copyright (c) 2022 Alibaba Group Holding Limited
 * @author Simon<gaomeng1900@gmail.com>
 * @description Track for Timeline
 */

import { DEV, assertStates } from './utils'
import type { TrackGroup } from './TrackGroup'

export interface TrackOptions {
	/**
	 * 命名，可以用来查找制定Track，也便与调试
	 * - used to identify a track. specify this if you want to get tracks by id
	 */
	id?: number | string
	loop?: boolean
	/**
	 * when to start this track
	 * @default currentTime of the parent timeline
	 */
	startTime?: number
	/**
	 * when to end this track
	 * @note use endTime or duration, not both
	 * @note if neither endTime or duration are input, duration will be set as Infinity
	 */
	endTime?: number
	/**
	 * how long is this track
	 * @note use endTime or duration, not both
	 * @note if neither endTime or duration are input, duration will be set as Infinity
	 */
	duration?: number
	/**
	 * callback for start (including every loop)
	 */
	onStart?: CallbackOnStart
	/**
	 * callback for end (including every loop)
	 */
	onEnd?: CallbackOnEnd
	/**
	 * callback for every tick (including start and end)
	 */
	onUpdate?: CallbackOnUpdate
	/**
	 * callback for init (call once before first start)
	 * @note use this to clean up and initialize a loop track or track on a loop timeline
	 * @note every time timeline loop back before track, this will be called
	 */
	onInit?: CallbackOnInit
	/**
	 * easing function (percent => easedPercent)
	 * @node input ∈ [0,1]
	 * @node output ∈ [0,1]
	 * @note easing(0) == 0
	 * @note easing(1) == 1
	 * @note must be monotonically non-decreasing
	 */
	easing?: EasingFunction
}

/**
 * Track 🚀 🚀 🚀
 * 轨道，代表时间线上的一个行为对象，有自己的startTime, duration等特性
 */
export interface Track extends TrackOptions {}
export class Track {
	id: number | string | undefined
	readonly isTrack = true

	private _startTime: number
	private _endTime: number
	private _duration: number

	/**
	 * set track.alive false to stop it immediately and mark it disposable.
	 */
	alive = true

	readonly loop: boolean

	// 保证只被add一次
	parent: null | TrackGroup = null

	/**
	 * this track has started and not yet ended
	 * @note always set .started true before set .running true
	 * @note if running true, started must be true
	 * @note running false but started true, means that this track has ended
	 */
	running = false // 运行中

	/**
	 * has this track been inited
	 */
	inited = false // 初始化完成

	/**
	 * has this track been started
	 */
	started = false // 本轮播放过

	/**
	 * which cycle of the loop (循环次数)
	 */
	iteration = 0

	/**
	 * whether this track is expired (是否已过期)
	 */
	get expired() {
		return this.started && !this.running
	}

	/**
	 * local current time for this track.
	 * @note track.currentTime ∈ [track.startTime, track.endTime]
	 * @note track.currentTime ≠ timeline.currentTime
	 */
	// currentTime = 0

	onStart: undefined | CallbackOnStart
	onEnd: undefined | CallbackOnEnd
	onUpdate: undefined | CallbackOnUpdate
	onInit: undefined | CallbackOnInit

	constructor({
		id,
		loop,
		startTime = 0,
		endTime,
		duration,
		onStart,
		onEnd,
		onUpdate,
		onInit,
		easing,
	}: TrackOptions = {}) {
		this.id = id

		this._startTime = startTime
		this.onStart = onStart
		this.onEnd = onEnd
		this.onUpdate = onUpdate
		this.onInit = onInit
		this.loop = loop !== undefined ? loop : false
		this.easing = easing

		// parameters check

		if (this.easing && (this.easing(0) !== 0 || this.easing(1) !== 1)) {
			console.warn('easingFunction error，（easing(0) should be 0, easing(1) should be 1）')
		}

		if (startTime !== undefined && isNaN(startTime)) throw new Error(`Timeline: startTime is nan`)
		if (duration !== undefined && isNaN(duration)) throw new Error(`Timeline: duration is nan`)
		if (endTime !== undefined && isNaN(endTime)) throw new Error(`Timeline: endTime is nan`)
		if (startTime < 0) throw new Error(`Timeline: startTime is negative`)

		// always use duration for internal logics

		let solvedDuration = duration

		if (duration === undefined && endTime === undefined) {
			solvedDuration = Infinity
		}

		if (duration !== undefined && endTime !== undefined) {
			console.warn('Timeline: both duration and endTime are provided. will ignore duration.')
			solvedDuration = endTime - startTime
		}

		if (endTime !== undefined) {
			solvedDuration = endTime - startTime
		}

		// solvedDuration should be a number now
		this._duration = solvedDuration as number
		this._endTime = this._startTime + this._duration

		if (this._endTime < this._startTime) throw new Error('Timeline: duration can not be negative')
	}

	/**
	 * start time of this track. modifying this will `drag` this track to a different position in timeline
	 */
	get startTime() {
		return this._startTime
	}
	set startTime(newTime) {
		if (this.started) throw new Error('Timeline: started track can not be modified again.')

		this._startTime = newTime
		this._endTime = this._startTime + this._duration

		if (isNaN(this._startTime)) throw new Error(`Timeline: startTime is nan`)
		if (this._startTime < 0) throw new Error(`Timeline: startTime is negative`)
	}

	/**
	 * end time of this track. modifying this will change the duration
	 */
	get endTime() {
		return this._endTime
	}
	set endTime(newTime) {
		if (this.started) throw new Error('Timeline: started track can not be modified again.')

		this._endTime = newTime
		this._duration = this._endTime - this._startTime

		if (this._endTime < this._startTime) {
			throw new Error('Timeline: duration can not be negative')
		}
	}

	/**
	 * duration of this track. modifying this will change the end time
	 */
	get duration() {
		return this._duration
	}
	set duration(newTime) {
		if (this.started) throw new Error('Timeline: started track can not be modified again.')

		this._duration = newTime
		this._endTime = this._startTime + this._duration

		if (this._endTime < this._startTime) {
			throw new Error('Timeline: duration can not be negative')
		}
	}

	// #region statesActions

	/**
	 * @precondition (!inited, !started, !running)
	 */
	private init() {
		if (DEV) assertStates(this, false, false, false)

		this.inited || (this.onInit && this.onInit())
		this.inited = true
	}

	/**
	 * @precondition (inited, !started, !running)
	 */
	private start(currentTime: number) {
		if (DEV) assertStates(this, true, false, false)

		this.started = true
		this.running = true
		// start it
		this.onStart && this.onStart()
		// update to current percent
		this.onUpdate && this.onUpdate(currentTime, this._getP(currentTime))
	}

	/**
	 * @precondition (inited, started, running)
	 */
	private end(endTime: number) {
		if (DEV) assertStates(this, true, true, true)

		// update to end percent
		this.onUpdate && this.onUpdate(endTime, 1)
		// end this
		this.onEnd && this.onEnd()
		this.running = false
	}

	/**
	 * @precondition (inited, !started, !running)
	 */
	private startAndEnd(endTime: number) {
		if (DEV) assertStates(this, true, false, false)

		this.started = true
		// start it
		this.onStart && this.onStart()
		// update to end percent
		this.onUpdate && this.onUpdate(endTime, 1)
		// end this
		this.onEnd && this.onEnd()

		// this.running = false
	}

	/**
	 * cycle changed. should end the last one, then start the new one, then update to current
	 * @precondition (inited, started, running)
	 */
	private changeCycle(currentTime: number) {
		if (DEV) assertStates(this, true, true, true)

		// end the last cycle
		this.onEnd && this.onEnd()
		// start the new cycle
		this.onStart && this.onStart()
		// update to current percent
		this.onUpdate && this.onUpdate(currentTime, this._getP(currentTime))
	}

	/**
	 * end it immediately and reset state.
	 * @precondition (inited, started, running_or_not)
	 */
	private reset() {
		if (DEV) assertStates(this, true, true)

		if (this.running) {
			this.onUpdate && this.onUpdate(this.endTime, 1)
			this.onEnd && this.onEnd()
		}

		this.inited = false
		this.started = false
		this.running = false

		this.init()
	}

	// #endregion

	tick(time: number) {
		if (!this.alive) return

		const startTime = this.startTime
		const endTime = this.endTime
		const duration = this.duration

		// this.currentTime = time

		if (!this.inited) {
			this.init()
		}

		if (this.loop) {
			/**
			 * @note can be negative if before time
			 */
			const currentCycle = Math.floor((time - startTime) / duration)
			/**
			 * localTime ∈ [startTime, endTime)
			 * @note if time right on the startTime, cycle will be the current, localTime will be startTime
			 * @note if time right on the endTime, cycle will be the next, localTime will be startTime
			 */
			const localTime = time - duration * currentCycle
			// console.log(currentCycle, localTime)

			// this.currentTime = localTime

			if (time >= startTime) {
				if (this.started) {
					if (this.iteration === currentCycle) {
						// update to current percent
						if (DEV) assertStates(this, true, true, true)
						this.onUpdate && this.onUpdate(localTime, this._getP(localTime))
					} else {
						this.changeCycle(localTime)
					}
				} else {
					this.start(localTime)
				}
			} else {
				if (this.started) {
					// time jump back to pre-track
					// 		from future when this track has started

					this.reset()
				}
			}

			this.iteration = currentCycle
		} else {
			// non-loop

			if (time < startTime) {
				// pre-track
				// state should be (!started, !running)
				if (this.started) {
					// time jump back to pre-track
					// 		from future when this track has started

					// end it immediately and reset state.
					this.reset()
				}
			} else if (time >= endTime) {
				// post-track
				// state should be (started, !running)

				// haven't started yet
				if (!this.started) {
					// if this track has not yet started. start it and end it immediately.
					// so that a track won't be missed.
					// NOTE: 避免整个动画被跳过，起码要播一下最后一帧
					this.startAndEnd(endTime)
				}

				// have started but haven't ended yet
				if (this.running) {
					this.end(endTime)
				}
			} else {
				// in-track
				// state should be (started, running)

				if (this.running) {
					// (inited, started, running)
					if (DEV) assertStates(this, true, true, true)
					this.onUpdate && this.onUpdate(time, this._getP(time))
				} else if (this.started) {
					// (started, !running) -> ended

					// this track has ended. time must has been jumped back from future
					// start this again and update to current percent

					// end it immediately and reset state.
					this.reset()

					// start again
					this.start(time)
				} else {
					// (!started && !running) -> first time into this track

					this.start(time)
				}
			}
		}
	}

	private _getP(localTime: number): number {
		let p = (localTime - this._startTime) / this._duration
		// 缓动
		if (this.easing) {
			p = this.easing(p)
		}
		return p
	}
}

export type CallbackOnStart = (
	/**
	 * the actual local current time when this happen
	 * @deprecated unclear definition
	 */
	currentTime?: number
) => void
export type CallbackOnEnd = (
	/**
	 * the actual local current time when this happen
	 * @deprecated unclear definition
	 */
	currentTime?: number
) => void
export type CallbackOnUpdate = (
	/**
	 * local current time when this happen
	 * @note ∈ loop ? [startTime, endTime) : [startTime, endTime]
	 */
	currentTime: number,
	/**
	 * percent of this track
	 * @note ∈ loop ? [0,1) ]: [0,1]
	 * @note if a easing function is provided, this value will be eased
	 */
	percent: number
) => void
export type CallbackOnInit = () => void
type EasingFunction = (percent: number) => number

// helpers

export function isTrack(track: any): track is Track {
	return track.isTrack
}
