/**
 * Copyright (c) 2022 Alibaba Group Holding Limited
 * @author Simon(西萌)<gaomeng1900@gmail.com>
 */

/**
 * A Time Controller with Superpower.
 * For Events And Animations.
 */

import { TrackGroup } from './TrackGroup'
import { raf, cancelRaf } from './utils'
import { getTimeNow } from './getTimeNow'
import { Stats } from './plugins/stats'
import { DEV } from './utils'

const EPSILON = Number.EPSILON || Math.pow(2, -52)

const CONFIG_DEFAULT = {
	/**
	 * how long is this timeline
	 *
	 * 整个时间线的时长，超出会停止或者循环
	 * @default Infinity
	 */
	duration: Infinity,
	/**
	 * enable looping for timeline
	 *
	 * 时长到达后是否从头循环
	 * @default false
	 */
	loop: false,
	/**
	 * automatically release dead tracks
	 *
	 * 如果时间线不停的运行而不回收过期的 track，会导致内存溢出，
	 * 如果时间线是循环的，track 加入一次之后再下一个循环仍要使用，则必须关掉该配置
	 * @default true
	 */
	autoRelease: true,

	// @note will break if ((in electron) || (use break points) || (in old browser) || (in node or web worker))
	// @note safer to check visibility outside and call pause manually
	// 页面非激活状态（requestAnimationFrame不工作）时，自动停止播放
	// 避免长时间页面切走后切回，造成的时间突进
	// pauseWhenInvisible: false,

	/**
	 * max time interval between frames, interval will be caped into this value
	 * - used to prevent big time jump after tab-change / process-sleep / break-point
	 *
	 * 最长帧时间限制，如果帧长度超过这个值，则会被压缩到这个值
	 * - 用于避免打断点或页面休眠后继续计时，恢复后时间突进
	 * @default 1000
	 * @unit ms
	 */
	maxStep: 1000,

	/**
	 * max FPS
	 * @advice **it is VERY recommended to set a reasonable fps cap**
	 * - 🌲🌲🌲 to save power from unnecessary redraws 🌲🌲🌲
	 * - to prevent wired behaviors on high refresh rate devices (like crazy fast animations on 300hz screens)
	 * - to prevent heating on mobile devices
	 *
	 * @advice If the device failed to render at stable 60fps.
	 * 		 You should cap it to a stable 30 fps rather than let it dither around 30~60 fps.
	 * 		 It will provide much more comfortable interaction that feel smooth and predictable for fingers and eyes.
	 *
	 * @note You can change this value any time by {@link Timeline.updateMaxFPS}
	 * @note this only cap the max fps. actual fps is very much related to the underlying runtime
	 * @note use `common divisors` like 60/30/20 instead of 24/25/40/50
	 *
	 * 最大帧率限制，用于节约计算性能
	 * 建议在无法稳定 60 fps 运行的机器上，将 fps 锁定在 30/20/10
	 * @suggestion 多数场景中，稳定的低帧率，流畅性高于不稳定的高帧率
	 * @default Infinity
	 */
	maxFPS: Infinity,

	// TODO fixme
	// 是否假设每两次requestAnimationFrame之间的间隔是相同的
	// fixStep: null,

	/**
	 * Open FPS Stats Panel
	 *
	 * 开启性能计数器面板
	 * @warning 基于 canvas 接口，不要再没有 dom 接口的环境中开启该功能
	 * @requires DOM
	 * @default false
	 */
	openStats: false,

	/**
	 * Decay of fps measurement
	 */
	recordFPSDecay: 0.5,
}

export type TimelineOptions = Partial<typeof CONFIG_DEFAULT> & {
	/**
	 * 如果回调抛错是否继续运行，如果关闭此项，回调抛错会导致整个timeline停止运行
	 * @deprecated use {@link TimelineOptions.onError} instead
	 */
	ignoreErrors?: boolean
	/**
	 * catch到的error是否要输出，如果开启ignoreErrors并且开启outputErrors，可能会由于连续打印错误而造成内存溢出
	 * @deprecated use {@link TimelineOptions.onError} instead
	 */
	outputErrors?: boolean

	/**
	 * handler for all the errors thrown from tracks' callback functions
	 * - if provided.
	 * 	- all errors will be caught and passed to this function.
	 * 	- timeline will keep running **unless** this function returns true
	 * - if not provided.
	 * 	- any error thrown from tracks will be thrown to global scope
	 * 	- timeline will stop immediately
	 */
	onError?: (error: Error) => void | true

	// legacy

	/**
	 * @deprecated use {@link TimelineOptions.autoRelease} instead
	 */
	autoRecevery?: boolean
	/**
	 * @deprecated use {@link TimelineOptions.autoRelease} instead
	 */
	autoDispose?: boolean
}

/**
 * Timeline 🪄🪄🪄
 */
export class Timeline extends TrackGroup {
	readonly isTimeline = true

	/**
	 * duration of this timeline.
	 * @readonly
	 * ```
	 * if loop
	 * 	'timeline will start from beginning'
	 * else
	 * 	'timeline will stop'
	 * ```
	 */
	readonly duration: number

	/**
	 * loop this timeline
	 * @readonly
	 */
	readonly loop: boolean

	/**
	 * is this playing (started and not yet ended or paused, next frame will be automatically fired)
	 * @readonly
	 */
	playing = false

	/**
	 * current time for this timeline.
	 * @note currentTime ∈ [0, duration]
	 * @readonly
	 */
	get currentTime() {
		return this._currentTime
	}

	/**
	 * auto calculated fps
	 * @readonly
	 */
	fps = 0

	/**
	 * auto calculated frametime
	 * @readonly
	 */
	frametime = 0

	// #region private

	/**
	 * HTML Canvas stats panel instance, if enabled
	 */
	private _stats?: any

	/**
	 * current time for this timeline.
	 * @note currentTime ∈ [0, duration]
	 * @note only _autoTick and seek should modify this directly
	 */
	private _currentTime = 0

	private readonly _config: TimelineOptions & Required<typeof CONFIG_DEFAULT>

	/**
	 * used to cap fps
	 * @note update this if maxFPS changed
	 */
	private _minFrametime: number

	/**
	 * currentTime = timeNow - _referenceTime
	 * - used by .seek
	 * - we can't change timeNow, since its given by underlying system
	 * - if we want to offset currentTime, we have to change _referenceTime
	 */
	private _referenceTime: number

	/**
	 * used to cancelRaf
	 */
	private _animationFrameID = 0

	/**
	 * 用于给setTimeout和setInterval分配ID
	 */
	private _timeoutID = 0

	private _timeBeforePaused = 0

	// #endregion

	// 创建一个Timeline实例，建议全局使用一个实例来方便同一控制所有行为与动画
	constructor(config: TimelineOptions = {}) {
		super()

		this._config = {
			...CONFIG_DEFAULT,
			...config,
		}

		// legacy. use autoDispose instead
		if (this._config.autoRecevery !== undefined) {
			console.warn('Timeline:: use config.autoRelease instead of config.autoRecevery.')
			this._config.autoRelease = this._config.autoRecevery
		}
		if (this._config.autoDispose !== undefined) {
			console.warn('Timeline:: use config.autoRelease instead of config.autoDispose.')
			this._config.autoRelease = this._config.autoDispose
		}

		if (this._config.autoRelease && this._config.loop) {
			// @note
			// tracks will be expired in the first round. the second loop will be empty.

			console.warn(
				'timeline: autoRelease and loop can not be used together. autoRelease will be disabled.'
			)

			this._config.autoRelease = false
		}

		this.duration = this._config.duration
		this.loop = this._config.loop

		// 频率限制
		this._minFrametime = 900 / this._config.maxFPS

		this._referenceTime = getTimeNow() // 参考时间

		// 显示性能指标
		if (this._config.openStats) {
			if (typeof document !== 'undefined' || typeof HTMLCanvasElement !== 'undefined') {
				this._stats = new Stats()
				this._stats.showPanel(0)
				document.body.appendChild(this._stats.dom)
			} else {
				throw new Error('timeline: DOM environment is necessary for stats panel.')
			}
		}
	}

	/**
	 * automatically tick next frame, using raf
	 */
	private _autoTick(lastTimeNow?: number): void {
		const timeNow = getTimeNow()
		const currentTime = timeNow - this._referenceTime

		// not first tick
		// @note all fps related logic should not consider .seek, should only consider timeNow
		if (lastTimeNow !== undefined) {
			const step = timeNow - lastTimeNow

			// FPS限制
			if (step < this._minFrametime) {
				// too fast, delay to next frame
				this._animationFrameID = raf(() => this._autoTick(lastTimeNow)) // @note not timeNow
				// this._config.onSkipFrame()
				// DEV && console.log('delay to next frame', step, currentTime, lastTimeNow)
				return
			} else {
				// DEV && console.log('handle in this frame', step, currentTime, lastTimeNow)
			}

			// 帧率统计
			this.frametime =
				this.frametime * (1 - this._config.recordFPSDecay) + step * this._config.recordFPSDecay // this does not consider maxStep
			this.fps = 1000 / this.frametime
		} else {
			DEV && console.debug('timeline DEV: _autoTick : lastTimeNow not provided')
		}

		// 最长帧限制
		if (currentTime - this._currentTime > this._config.maxStep) {
			// - bump this.currentTime by this._config.maxStep
			// - adjust this._referenceTime so that next tick will be right
			this.seek(this._currentTime + this._config.maxStep)
		} else {
			// natural time passes
			this._currentTime = currentTime
		}

		const duration = this.duration
		if (this.currentTime >= duration) {
			// loop and end
			if (DEV) console.log('timeline: currentTime >= duration')

			if (this.loop) {
				// @note be very careful with tracks that have same start / end time with timeline
				// 		 test them to decide what to do here

				// @note not right way to reset tracks;
				// 		will cause loop tracks that end together with loop timeline
				// 		to have an extra start/end events in the end.
				// debugger
				// end it correctly
				// this.seek(duration)
				// this.tick() // fire all the necessary onEnd

				// reset
				// debugger
				const backupCurrentTime = this.currentTime
				this.seek(-EPSILON)
				this.tick() // fire all the necessary reset (including onEnd) & onInit

				// start again at the right time
				// debugger
				this.seek(backupCurrentTime % duration)
				this.tick() // fire all the necessary onStart

				// debugger

				// fire next
				this._animationFrameID = raf(() => this._autoTick(timeNow))
			} else {
				// end this
				this.playing = false

				// end it correctly
				this.seek(duration)
				this.tick() // fire all the necessary onEnd in tracks
			}
		} else {
			this.tick()
			this._animationFrameID = raf(() => this._autoTick(timeNow))
		}
	}

	/**
	 * fire one tick
	 * @note will use this.currentTime as current time
	 * @note if you want to tick a specific time, call .seek before this
	 */
	tick() {
		// @TODO 需要标定 try-catch-finally 在不同浏览器中对性能的影响
		try {
			if (this._stats) this._stats.begin()

			// 逐个轨道处理
			for (let i = 0; i < this.tracks.length; i++) {
				this.tracks[i].tick(this.currentTime)
			}

			// 自动回收
			// console.time('recovery')
			if (this._config.autoRelease) {
				this.release()
			}
			// console.timeEnd('recovery')

			if (this._stats) this._stats.end()
		} catch (e) {
			// legacy
			if (this._config.ignoreErrors !== undefined || this._config.outputErrors !== undefined) {
				console.warn('timeline: use onError instead of ignoreErrors/outputErrors')
			}

			if (this._config.outputErrors) console.error(e)
			if (!this._config.ignoreErrors) {
				if (this._config.onError !== undefined) {
					this._config.onError(e as Error)
				} else {
					this.stop() // 避免与pauseWhenInvisible冲突
					throw e
				}
			}
		}

		return this
	}

	/**
	 * start play this timeline.
	 * @note if timeline already started, calling play again will make it start from beginning.
	 */
	play() {
		if (this.playing) {
			console.warn('timeline: already playing')
			this.stop()
		}

		this.playing = true
		this._referenceTime = getTimeNow()
		this._autoTick()
		return this
	}

	/**
	 * jump to a specific time, used to manipulate timeline
	 * @note this will change the reference time of this timeline
	 * @note it is safe to call this on a playing timeline
	 */
	seek(time: number) {
		this._currentTime = time
		// adjust _referenceTime to make next tick right
		this._referenceTime = getTimeNow() - time
		return this
	}

	/**
	 * stop playing
	 */
	stop() {
		this.playing = false
		cancelRaf(this._animationFrameID)
		return this
	}

	/**
	 * pause playing
	 */
	pause() {
		this.playing = false
		this._timeBeforePaused = this.currentTime
		cancelRaf(this._animationFrameID)
		return this
	}

	/**
	 * restore playing from pause or stop
	 */
	resume() {
		// if already paused, this has no effect
		// if stopped, this will change the state to paused (update _timeBeforePaused)
		// if playing, this will change the state to paused
		this.pause()

		this.seek(this._timeBeforePaused)
		this.playing = true
		this._autoTick()
		return this
	}

	/**
	 * Native-like APIs are provided on the Timeline instance.
	 * So that these callbacks can sync with other tracks on timeline.
	 *
	 * These method will create tracks to simulate native timers.
	 *
	 * @note Using both timeline and native timer APIs for related logics will cause problems.
	 *       Because native timers don't pause or rewind when timeline does.
	 *
	 * @return {Integer} timeoutID
	 */
	setTimeout(callback: () => void, time = 10) {
		if (time < 0) time = 0
		const ID = this._timeoutID++
		this.addTrack({
			id: '__timeout__' + ID,
			startTime: this.currentTime + time,
			duration: 1000,
			loop: false,
			onStart: callback,
		})
		return ID
	}

	/**
	 * Native-like APIs are provided on the Timeline instance.
	 * So that these callbacks can sync with other tracks on timeline.
	 *
	 * These method will create tracks to simulate native timers.
	 *
	 * @note Using both timeline and native timer APIs for related logics will cause problems.
	 *       Because native timers don't pause or rewind when timeline does.
	 *
	 * @return {Integer} intervalID
	 */
	setInterval(callback: () => void, time = 10) {
		if (time < 0) time = 0
		const ID = this._timeoutID++
		this.addTrack({
			id: '__timeout__' + ID,
			startTime: this.currentTime + time,
			duration: time,
			loop: true,
			onStart: callback,
		})
		return ID
	}

	/**
	 * Native-like APIs are provided on the Timeline instance.
	 * So that these callbacks can sync with other tracks on timeline.
	 *
	 * These method will create tracks to simulate native timers.
	 *
	 * @note Using both timeline and native timer APIs for related logics will cause problems.
	 *       Because native timers don't pause or rewind when timeline does.
	 */
	clearTimeout(ID: number) {
		const track = this.getTracksByID('__timeout__' + ID)[0]
		if (track) {
			track.alive = false
		}
	}

	/**
	 * Native-like APIs are provided on the Timeline instance.
	 * So that these callbacks can sync with other tracks on timeline.
	 *
	 * These method will create tracks to simulate native timers.
	 *
	 * @note Using both timeline and native timer APIs for related logics will cause problems.
	 *       Because native timers don't pause or rewind when timeline does.
	 */
	clearInterval(ID: number) {
		this.clearTimeout(ID)
	}

	/**
	 * update FPS cap dynamically at runtime
	 */
	updateMaxFPS(maxFPS: number) {
		if (maxFPS <= 0) throw new Error('timeline: maxFPS must be greater than 0')
		this._config.maxFPS = maxFPS
		this._minFrametime = 900 / maxFPS
	}

	/**
	 * stop all tracks and destroy this timeline
	 * @note destroyed timeline can not be used or restored again
	 */
	dispose() {
		this.stop()
		this.tracks = []

		// @note bad practice but safe
		// const disposedMethod = () => {
		// 	throw new Error('timeline: disposed')
		// 	return this
		// }
		// this.play = disposedMethod
		// this.tick = disposedMethod
		// this.tick = disposedMethod
		// this._autoTick = disposedMethod

		if (this._stats) {
			document.body.removeChild(this._stats.dom)
		}

		;(this as any).config = null as any
	}

	/**
	 * @deprecated
	 */
	getTime() {
		return this._referenceTime + this.currentTime
	}

	/**
	 * @alias {@link dispose}
	 * @deprecated use {@link dispose}
	 */
	destroy() {
		this.dispose()
	}
}

export default Timeline
