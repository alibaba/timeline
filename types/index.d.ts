//

interface TrackParamsEndTime {
	/**
	 * 结束时间
	 */
	endTime: number
	duration?: never
}

interface TrackParamsDuration {
	endTime?: never
	/**
	 * 持续时间
	 */
	duration: number
}

type TrackParamsEnd = TrackParamsEndTime | TrackParamsDuration

interface TrackParamsCommon {
	/**
	 * name of the track, only for debuging
	 * 为 track 命名，方便调试，不需要唯一
	 * @default ''
	 */
	id?: string | number

	/**
	 * 是否循环
	 * @default false
	 */
	loop?: boolean

	/**
	 * 开始时间
	 * @default 0
	 */
	startTime?: number

	/**
	 * track 开始时的回调，每次 loop 会被执行一次
	 */
	onStart?: (currentTime: number) => void

	/**
	 * track 结束时的回调，每次 loop 会被执行一次
	 */
	onEnd?: (currentTime: number) => void

	/**
	 * track 更新时的回调，每帧执行一次
	 */
	onUpdate?: (currentTime: number, percentage: number) => void

	/**
	 * track 初始化时的回调，在首次 onstart 前执行一次
	 */
	onInit?: (currentTime: number) => void

	/**
	 * 缓动函数，
	 * 对 percentage 进行曲线变换
	 */
	easing?: (percent: number) => number
}

type TrackParams = TrackParamsCommon & TrackParamsEnd

// const a : TrackParams  ={
// 	endTime: 10,
// 	duration: 20,
// }

declare class Track {
	constructor(param: TrackParams)

	/**
	 * 自动分配
	 */
	uuid: string
	isTrack: true
	startTime: number
	endTime: number
	duration: number
	alive: boolean

	/**
	 * track 开始时的回调，每次 loop 会被执行一次
	 */
	onStart?: (currentTime: number) => void

	/**
	 * track 结束时的回调，每次 loop 会被执行一次
	 */
	onEnd?: (currentTime: number) => void

	/**
	 * track 更新时的回调，每帧执行一次
	 */
	onUpdate?: (currentTime: number, percentage: number) => void

	/**
	 * track 初始化时的回调，在首次 onstart 前执行一次
	 */
	onInit?: (currentTime: number) => void
}

declare class TrackGroup extends Track {
	tracks: Track[]

	/**
	 * 根据配置创建一个Track
	 */
	addTrack(track: TrackParams | Track): Track
	/**
	 * 根据配置创建一个Track
	 */
	add(track: TrackParams | Track): Track

	/**
	 * 根据 track.id 查找 track
	 * @param id
	 */
	getTracksByID(id): Track[]

	/**
	 * 停掉自己的一个track，并标记这个track可被清理（仅停止不清空）
	 * @param track
	 */
	stopTrack(track: Track): void

	/**
	 * 回收停止了的 track（清空已标记为停止的tracks）
	 */
	recovery(): void

	/**
	 * 清空自己的 tracks（仅清空所有tracks，不停止）
	 */
	clear(): void
}

interface TimleineParams {
	/**
	 * 整个时间线的时长，超出会停止或者循环
	 * @default Infinity
	 */
	duration?: number

	/**
	 * 时长到达后是否从头循环
	 * @default false
	 */
	loop?: boolean

	/**
	 * 是否每隔一段时间就自动回收已经停止的 tracks
	 * 如果时间线不停的运行而不回收过期的 track，会导致内存溢出
	 * 如果时间线是循环的，track 加入一次之后再下一个循环仍要使用，则必须关掉该配置
	 * @default true
	 */
	autoRecevery?: boolean

	/**
	 * 是否在标签页处于不可见状态（requestAnimationFrame不工作）时，自动暂停时间线
	 * 可以避免长时间页面切走后切回，造成的时间突进、大量track集中执行
	 * @warning 请谨慎开启该特性!!! 建议使用 maxStep 取代该功能!!!
	 * @warning 已知 electron 等 cef/webview 实现中，无法准确判断标签页可见性，会导致问题
	 * @warning 进入断点后改变标签页可见性，会导致问题
	 * @deprecated 使用 maxStep 替代该功能来避免平台兼容性问题
	 * @default false
	 */
	pauseWhenInvisible?: boolean

	/**
	 * 最长帧时间限制，如果帧长度超过这个值，则会被压缩到这个值
	 * 可以避免长时间页面切走后切回，造成的时间突进、大量track集中执行
	 * 可以避免断点调试后时间突进
	 * @default Infinity
	 */
	maxStep?: number

	/**
	 * 最大帧率限制，用于节约计算性能
	 * 建议在无法稳定 60 fps 运行的机器上，将 fps 锁定在 30/20/10
	 * @suggestion 多数场景中，稳定的低帧率，流畅性高于不稳定的高帧率
	 * @default Infinity
	 */
	maxFPS?: number
	// fixStep?: false

	/**
	 * 如果回调抛错是否继续运行
	 * 如果关闭此项，回调抛错会导致整个timeline停止运行
	 * 如果打开此项，回调抛错后 timeline 继续运行
	 * @default true
	 */
	ignoreErrors?: boolean

	/**
	 * 如果打开 ignoreErrors，回调抛错后是否在 console 中打印错误
	 * 如果关闭此项，回调中抛的错将直接被忽略掉，只能在 onError 中处理
	 * 如果打开此项，且回调连续抛错，可能会导致 console 内存溢出
	 * @requires ignoreErrors=true
	 * @default true
	 */
	outputErrors?: boolean

	/**
	 * 开启性能计数器面板
	 * @warning 基于 canvas 接口，不要再没有 dom 接口的环境中开启该功能
	 * @requires document
	 * @default false
	 */
	openStats?: boolean

	/**
	 * track 开始时的回调，每次 loop 会被执行一次
	 */
	onStart?: (currentTime: number) => void

	/**
	 * track 结束时的回调，每次 loop 会被执行一次
	 */
	onEnd?: (currentTime: number) => void

	/**
	 * track 更新时的回调，每帧执行一次
	 */
	onUpdate?: (currentTime: number, percentage: number) => void

	/**
	 * track 初始化时的回调，在首次 onstart 前执行一次
	 */
	onInit?: (currentTime: number) => void

	/**
	 * 错误处理，暂未实现，误使用
	 * @TODO
	 * @deprecated
	 * @throws UMIMPLEMENT
	 */
	onError?: (source: Track, method: string, error: any) => void
}

declare class Timeline extends TrackGroup {
	isTimeline: true

	/**
	 * 当前时间
	 */
	currentTime: number

	/**
	 * 是否正在播放
	 */
	playing: boolean

	constructor(params: TimleineParams)

	/**
	 * 实时更新 fps 上限
	 * 你可以自己监控系统资源占用来动态调整刷新率，降低资源消耗的同时保证页面响应
	 */
	updateMaxFPS(newFPSCap: number): void

	/**
	 * 开始播放 timeline
	 */
	play(): void

	/**
	 * 调到指定时间
	 * @param time
	 */
	seek(time: number): void

	/**
	 * 停止播放(不可恢复)
	 */
	stop(): void

	/**
	 * 暂停播放（可恢复）
	 */
	pause(): void

	/**
	 * 从暂停中恢复
	 */
	resume(): void

	/**
	 * 清理掉整个Timeline
	 * 目前没有发现需要单独清理的内存溢出点
	 */
	destroy(): void

	/**
	 * @TODO
	 */
	dispose(): void

	/**
	 * 重写Dom标准中的 setTimeout，来和 timeline 中的其他 track 对齐
	 * 实质是创建一个只有 onEnd 回调的 track
	 * 使用这个接口可以避免 global.setTimeout 与基于 requestAnimationFrame 的 timeline track 时机错位
	 * @return {Integer} timeoutID
	 */
	setTimeout(): number

	/**
	 * 重写Dom标准中的 setInterval
	 * 实质是创建一个只有 onEnd 回调的 track
	 * 使用这个接口可以避免 global.setInterval 与基于 requestAnimationFrame 的 timeline track 时机错位
	 * @return {Integer} intervalID
	 */
	setInterval(): number

	clearTimeout(timeoutID: number): void
	clearInterval(): void

	/**
	 * @deprecated
	 */
	getTime(): void

	/**
	 * 多进程 timeline 同步
	 */
	listen(): void

	/**
	 * 多进程 timeline 同步
	 */
	stopListen(): void

	/**
	 * 多进程 timeline 同步
	 */
	setOrigin(): void
}

export default Timeline
export { Timeline }
