import {DefaultOptons, Options, TrackerConfig, reportTrackerData } from '../type/core'
import {createHistoryEvent} from '../utils/pv'
const MouseEventList: string[] = ['click', 'dbclick', 'contextmenu', 'mousedown', 'mouseup', 'mouseenter', 'mouseout', 'mouseover']

export default class Tracker {
  public data: Options
  private version: string|undefined

  public constructor(options: Options){
    this.data = Object.assign(this.initDef(), options)
    this.installInnerTrack()
  }

  private initDef(): DefaultOptons {
    this.version = TrackerConfig.version
    // 监听路由跳转
    window.history['pushState'] = createHistoryEvent('pushState')
    window.history['replaceState'] = createHistoryEvent('replaceState')
    return <DefaultOptons> {
      sdkVersion: this.version,
      historyTracker: false,
      hashTracker: false,
      domTracker: false,
      jsError: false
    }
  }

  public setUserId<T extends DefaultOptons['uuid']>(uuid: T) {
    this.data.uuid = uuid
  }
  public setExtra<T extends DefaultOptons['extra']>(extra: T) {
    this.data.extra = extra
  }
  public sendTracker<T extends reportTrackerData>(data: T) {
    this.reportTracker(data)
  }

  private captureEvnets<T>(MouseEventList: string[], targetKey: string, data?:T){
    MouseEventList.forEach(event => {
      window.addEventListener(event, () => {
        this.reportTracker({event, targetKey, data})
      })
    })
  }

  private installInnerTrack() {
    if (this.data.historyTracker) {
      this.captureEvnets(['pushState'], 'history-pv')
      this.captureEvnets(['replaceState'], 'history-pv')
      this.captureEvnets(['popState'], 'history-pv')
    }

    if(this.data.hashTracker){
      this.captureEvnets(['hashchange'], 'hash-pv')
    }

    if (this.data.domTracker){
      this.targetKeyReport()
    }

    if (this.data.jsError) {
      this.jsError()
    }
  }

  private targetKeyReport(){
    MouseEventList.forEach(event => {
      window.addEventListener(event, e => {
        const target = e.target as HTMLElement
        const targetValue = target.getAttribute('target-key')
        if (targetValue) {
          this.sendTracker({
            targetKey: targetValue,
            event
          })
        }
      })
    })
  }

  private jsError(){
    this.errorEvent()
    this.promiseReject()
  }

  private errorEvent(){
    window.addEventListener('error', e=> {
      this.sendTracker({
        targetKey: 'message',
        event: 'error',
        message: e.message
      })
    })
  }
  private promiseReject(){
    window.addEventListener('unhandledrejection', event => {
      event.promise.catch(error => {
        this.sendTracker({
          targetKey: 'reject',
          event: 'promise',
          message: error
        })
      })
    })
  }

  // 上报信息
  private reportTracker<T>(data:T){
    const params = Object.assign(this.data, data, {time: Date.now()})
    let headers = {
      type: 'application/x-www-form-urlencode'
    }
    let blob = new Blob([JSON.stringify(params)], headers)
    navigator.sendBeacon(this.data.requestUrl, blob)
  }
}