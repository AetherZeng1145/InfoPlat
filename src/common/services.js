import fetch from "@system.fetch"
import { toAreaCode } from "./citymap"

const CURRENTS_API_KEY = "I_gqH5IB0yC8eS7mhIVx7LmQkx2IpDOtmCI6WTsksar1EFbA"
const CURRENTS_BASE_URL = "https://api.currentsapi.services/v1"

const PROVIDERS = {
  weather: {
    name: "tmini-天气",
    url: "https://tmini.net/api/weather",
    key: "",
    note: "tmini天气API，按行政区域编号查询实时天气。"
  },
  express: {
    name: "tmini-快递查询",
    url: "https://tmini.net/api/kuaiok",
    key: "",
    note: "tmini快递查询API，可按运单号查询物流信息。"
  }
}

function encodeQuery(params) {
  const parts = []
  Object.keys(params).forEach((key) => {
    const value = params[key]
    if (value !== "" && value !== undefined && value !== null) {
      parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(value))
    }
  })
  return parts.join("&")
}

function parseData(data) {
  if (typeof data === "string") {
    try {
      return JSON.parse(data)
    } catch (err) {
      return {}
    }
  }
  return data || {}
}

function request(options) {
  const url = options.url
  const method = options.method || "GET"
  const responseType = options.responseType || "json"

  return new Promise((resolve, reject) => {
    let isCompleted = false

    // Set a manual 60s timeout
    const timeoutId = setTimeout(() => {
      if (!isCompleted) {
        isCompleted = true
        reject(new Error("Timeout"))
      }
    }, 60000)

    fetch.fetch({
      url: url,
      method: method,
      header: options.header || {},
      responseType: responseType,
      success(res) {
        if (isCompleted) return
        isCompleted = true
        clearTimeout(timeoutId)

        const code = res.code || res.statusCode

        let data = res.data
        if (responseType === "json" && typeof data === "string") {
          data = parseData(data)
        }

        if (code >= 200 && code < 300) {
          resolve(data)
        } else if (data && typeof data === "object") {
          // fallback: 响应体存在且是对象，直接使用
          resolve(data)
        } else {
          reject(new Error("HTTP " + code))
        }
      },
      fail(data, code) {
        if (isCompleted) return
        isCompleted = true
        clearTimeout(timeoutId)

        reject(new Error("Fetch failed: " + code))
      }
    })
  })
}

/**
 * Fetch raw text/html
 */
export function fetchText(url) {
  return request({
    url: url,
    method: "GET",
    responseType: "text"
  })
}

function stripHtmlAndFilter(text) {
  if (!text) return ""
  let cleanText = text.replace(/<[^>]+>/g, " ")
  cleanText = cleanText.replace(/&nbsp;/g, " ")
                       .replace(/&quot;/g, "\"")
                       .replace(/&amp;/g, "&")
                       .replace(/&lt;/g, "<")
                       .replace(/&gt;/g, ">")

  let lines = cleanText.split(/[\r\n]+/)
  let filteredLines = lines.filter((line) => line.indexOf("⬅️") === -1)

  return filteredLines.join("\n").trim()
}

function cleanDescription(text) {
  if (!text) return ""
  var cleaned = text
  // 去掉来源标注
  cleaned = cleaned.replace(/来源[：:].*$/gm, "")
  cleaned = cleaned.replace(/编辑[：:].*$/gm, "")
  cleaned = cleaned.replace(/责任编辑[：:].*$/gm, "")
  cleaned = cleaned.replace(/【.*?】/g, "")
  // 去掉链接和多余空格
  cleaned = cleaned.replace(/https?:\/\/\S+/g, "")
  cleaned = cleaned.replace(/\s+/g, " ").trim()
  // 截断过长内容
  if (cleaned.length > 120) {
    cleaned = cleaned.substring(0, 120)
    // 在句号处截断
    var lastDot = cleaned.lastIndexOf("。")
    if (lastDot > 60) {
      cleaned = cleaned.substring(0, lastDot + 1)
    } else {
      cleaned = cleaned + "……"
    }
  }
  return cleaned
}

function extractSourceName(url) {
  if (!url) return ""
  try {
    var domain = url.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "")
    // Map domains to friendly Chinese names
    var nameMap = {
      "finance.sina.com.cn": "新浪财经",
      "news.sina.com.cn": "新浪新闻",
      "sina.com.cn": "新浪",
      "ithome.com": "IT之家",
      "news.cn": "新华网",
      "xinhuanet.com": "新华网",
      "people.com.cn": "人民网",
      "peopleapp.com": "人民网",
      "cctv.com": "央视网",
      "cctv.cn": "央视网",
      "ysxw.cctv.cn": "央视新闻",
      "huanqiu.com": "环球网",
      "163.com": "网易",
      "news.163.com": "网易新闻",
      "sohu.com": "搜狐",
      "qq.com": "腾讯新闻",
      "new.qq.com": "腾讯新闻",
      "weixin.qq.com": "微信",
      "mp.weixin.qq.com": "微信公众号",
      "weibo.com": "微博",
      "ifeng.com": "凤凰新闻",
      "thepaper.cn": "澎湃新闻",
      "yicai.com": "第一财经",
      "caixin.com": "财新网",
      "36kr.com": "36氪",
      "bjnews.com.cn": "新京报",
      "stcn.com": "证券时报",
      "cls.cn": "财联社",
      "wallstreetcn.com": "华尔街见闻",
      "jiemian.com": "界面新闻",
      "chinadaily.com.cn": "中国日报",
      "chinanews.com": "中新网",
      "cankaoxiaoxi.com": "参考消息",
      "nbd.com.cn": "每日经济新闻",
      "21jingji.com": "21世纪经济报道",
      "csdn.net": "CSDN",
      "zhihu.com": "知乎",
      "baidu.com": "百度"
    }
    if (nameMap[domain]) return nameMap[domain]
    // Fallback: return domain without TLD
    var parts = domain.split(".")
    return parts.length >= 2 ? parts[parts.length - 2] : domain
  } catch (e) {
    return ""
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ""
  // "2026-06-25 04:33:39 +0000" → "06-25"
  var match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    return match[2] + "-" + match[3]
  }
  return dateStr
}

function normalizeNews(item) {
  if (!item) return null
  const category = item.category && item.category.length ? item.category.join(" / ") : ""
  const source = extractSourceName(item.url) || item.author || "未知来源"
  const title = stripHtmlAndFilter(item.title) || "未命名新闻"
  const desc = cleanDescription(item.description) || "暂无摘要"
  return {
    id: item.id || "",
    title: title,
    description: desc,
    source: source,
    category: category,
    url: item.url || "",
    published: formatDate(item.published)
  }
}

// Trusted Chinese domestic news domains
const DOMAIN_WHITELIST = [
  "sina.com.cn", "finance.sina.com.cn", "news.sina.com.cn",
  "sohu.com",
  "163.com", "news.163.com",
  "people.com.cn", "peopleapp.com",
  "xinhuanet.com", "news.cn",
  "chinanews.com",
  "ithome.com",
  "baidu.com", "baijiahao.baidu.com",
  "qq.com", "new.qq.com", "weixin.qq.com", "mp.weixin.qq.com",
  "ifeng.com",
  "caixin.com",
  "36kr.com",
  "csdn.net",
  "zhihu.com",
  "weibo.com",
  "cctv.com", "cctv.cn", "ysxw.cctv.cn", "vod-finance.cctv.cn",
  "bjnews.com.cn",
  "thepaper.cn",
  "yicai.com",
  "huanqiu.com",
  "cankaoxiaoxi.com",
  "stcn.com",
  "nbd.com.cn",
  "cls.cn",
  "wallstreetcn.com",
  "jiemian.com",
  "21jingji.com",
  "ceweekly.cn",
  "chinadaily.com.cn",
  "infzm.com",
  "sztv.com.cn",
  "sznews.com",
  "hangzhou.com.cn",
  "wxrb.com",
  "xizang.gov.cn"
]

function extractDomain(url) {
  if (!url) return ""
  try {
    // Remove protocol
    var domain = url.replace(/^https?:\/\//, "")
    // Remove path
    domain = domain.split("/")[0]
    // Remove port
    domain = domain.split(":")[0]
    // Remove www.
    domain = domain.replace(/^www\./, "")
    return domain.toLowerCase()
  } catch (e) {
    return ""
  }
}

function isTrustedDomain(url) {
  var domain = extractDomain(url)
  if (!domain) return false
  for (var i = 0; i < DOMAIN_WHITELIST.length; i++) {
    if (domain === DOMAIN_WHITELIST[i] || domain.endsWith("." + DOMAIN_WHITELIST[i])) {
      return true
    }
  }
  return false
}

export function getLatestNews(options) {
  const params = options || {}
  const categories = params.categories && params.categories.length ? params.categories.join(",") : ""

  const query = encodeQuery({
    language: "zh",
    country: "CN",
    category: categories,
    page_size: params.pageSize || 20,
    apiKey: CURRENTS_API_KEY.trim()
  })

  return request({
    url: CURRENTS_BASE_URL + "/latest-news?" + query
  }).then((data) => {
    if (!data || data.status !== "ok" || !data.news) {
      return []
    }
    var filtered = data.news
      .map(normalizeNews)
      .filter(function (item) {
        if (!item) return false
        if (!isTrustedDomain(item.url)) {
          return false
        }
        // 过滤掉 description 为空或和 title 一样的新闻
        if (!item.description || item.description === item.title) {
          return false
        }
        return true
      })
    return filtered
  })
}

export function getWeather(city) {
  var areaCode = toAreaCode(city)
  if (!areaCode) {
    return Promise.resolve({
      ready: false,
      title: city,
      subtitle: "未知城市",
      message: "未找到该城市的区域编号",
      details: [],
      detailsExtra: [],
      indexes: [],
      forecasts: [],
      alerts: []
    })
  }

  var query = encodeQuery({
    location: areaCode
  })
  return request({
    url: PROVIDERS.weather.url + "?" + query
  }).then((data) => {
    if (!data || data.code !== 0 || !data.data) {
      return {
        ready: false,
        title: city,
        subtitle: "查询失败",
        message: data && data.msg ? data.msg : "天气数据暂不可用",
        details: [],
        detailsExtra: [],
        indexes: [],
        forecasts: [],
        alerts: []
      }
    }
    var now = data.data.now || {}
    var loc = data.data.location || {}
    var temp = now.temp !== undefined ? now.temp : "--"
    var desc = now.text || "未知"
    var feelsLike = now.feels_like !== undefined ? now.feels_like : "--"
    var humidity = now.rh !== undefined ? now.rh + "%" : "--"
    var windDir = now.wind_dir || "--"
    var windClass = now.wind_class || "--"
    var aqi = now.aqi || 0
    var pm25 = now.pm25 || 0
    var pm10 = now.pm10 || 0
    var clouds = now.clouds !== undefined ? now.clouds + "%" : "--"
    var vis = now.vis !== undefined ? (now.vis / 1000).toFixed(1) + "km" : "--"
    var pressure = now.pressure !== undefined ? now.pressure + "hPa" : "--"
    var district = loc.name || city

    // 生活指数
    var indexes = []
    var rawIndexes = data.data.indexes || []
    for (var i = 0; i < rawIndexes.length; i++) {
      indexes.push({ name: rawIndexes[i].name, brief: rawIndexes[i].brief, detail: rawIndexes[i].detail || "" })
    }

    // 7天预报
    var forecasts = []
    var rawForecasts = data.data.forecasts || []
    var weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
    var today = new Date()
    for (var j = 0; j < rawForecasts.length && j < 7; j++) {
      var f = rawForecasts[j]
      var day = weekDays[(today.getDay() + j) % 7]
      forecasts.push({
        day: day,
        info: (f.text_day || "--") + "/" + (f.text_night || "--") + " " + (f.low || "--") + "~" + (f.high || "--") + "°C"
      })
    }

    // 预警
    var alerts = []
    var rawAlerts = data.data.alerts || []
    for (var k = 0; k < rawAlerts.length; k++) {
      alerts.push({
        title: rawAlerts[k].type + rawAlerts[k].level + " 正在生效",
        alertTitle: rawAlerts[k].title || "",
        desc: rawAlerts[k].desc || ""
      })
    }

    return {
      ready: true,
      title: district,
      subtitle: desc,
      message: temp + "°C",
      details: [
        { label: "天气", value: desc },
        { label: "温度", value: temp + "°C" },
        { label: "体感", value: feelsLike + "°C" },
        { label: "湿度", value: humidity },
        { label: "风向", value: windDir },
        { label: "风力", value: windClass }
      ],
      detailsExtra: [
        { label: "云量", value: clouds },
        { label: "能见度", value: vis },
        { label: "气压", value: pressure },
        { label: "PM2.5", value: "" + pm25 },
        { label: "PM10", value: "" + pm10 },
        { label: "AQI", value: "" + aqi }
      ],
      indexes: indexes,
      forecasts: forecasts,
      alerts: alerts
    }
  })
}

export function getExpress(trackingNo) {
  const provider = PROVIDERS.express
  if (!trackingNo) {
    return Promise.resolve({
      ready: false,
      title: "请输入运单号",
      subtitle: provider.name,
      message: "请在下方输入框输入快递运单号进行查询",
      details: ["支持主流快递公司", "输入运单号后点击查询按钮"]
    })
  }

  const query = encodeQuery({
    trackingNo: trackingNo,
    ckey: provider.key
  })
  return request({
    url: provider.url + "?" + query
  }).then((data) => {

    // tmini API 返回格式处理
    // 成功状态码: "0000000000"
    if (data && data.code === "0000000000" && data.data) {
      const expressData = data.data
      const packageList = expressData.packageInfoList || []

      if (packageList.length === 0) {
        return {
          ready: false,
          title: trackingNo,
          subtitle: "未找到物流信息",
          message: "该运单号暂无物流信息",
          status: "",
          details: []
        }
      }

      // 取第一个包裹的信息
      const pkg = packageList[0]
      const trackingDetails = pkg.trackingDetails || []

      // 格式化时间 UTC -> UTC+8 (20260512111740 -> 2026-05-12 19:17:40)
      function formatTime(timeStr) {
        if (!timeStr || timeStr.length !== 14) return timeStr || ""
        var y = parseInt(timeStr.substring(0, 4), 10)
        var mo = parseInt(timeStr.substring(4, 6), 10) - 1
        var d = parseInt(timeStr.substring(6, 8), 10)
        var h = parseInt(timeStr.substring(8, 10), 10) + 8
        var mi = parseInt(timeStr.substring(10, 12), 10)
        var s = parseInt(timeStr.substring(12, 14), 10)
        // 处理溢出
        if (h >= 24) { h -= 24; d += 1 }
        // 简单处理月份溢出（不考虑年份溢出）
        var daysInMonth = [31,28,31,30,31,30,31,31,30,31,30,31]
        if (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) daysInMonth[1] = 29
        if (d > daysInMonth[mo]) { d = 1; mo += 1 }
        if (mo > 11) { mo = 0; y += 1 }
        var pad2 = function(v) { return v < 10 ? "0" + v : "" + v }
        return y + "-" + pad2(mo + 1) + "-" + pad2(d) + " " + pad2(h) + ":" + pad2(mi) + ":" + pad2(s)
      }

      // 状态映射
      function getStateText(state) {
        var s = (state || "").toUpperCase()
        var stateMap = {
          "ACCEPT": "已揽收",
          "TRANSIT": "正在运输中",
          "DELIVERING": "待取件",
          "FINISH": "已签收",
          "CANCEL": "已取消",
          "ABNORMAL": "物流运输异常",
          "FAILED": "物流运输异常"
        }
        return stateMap[s] || state || ""
      }

      // 快递公司名修正映射（API 返回不准时用）
      const CP_NAME_FIX = {
        "菜鸟裹裹": "中国邮政",
        "菜鸟": "中国邮政",
        "YZ": "中国邮政",
        "YZBK": "中国邮政",
        "EMS": "中国邮政EMS"
      }

      var rawCpName = pkg.cpName || pkg.cp || ""
      var cpName = CP_NAME_FIX[rawCpName] || rawCpName || "快递公司"

      return {
        ready: true,
        title: trackingNo,
        subtitle: cpName,
        message: pkg.operateMessage || "暂无最新状态",
        status: getStateText(pkg.state || ""),
        details: trackingDetails.slice(0, 8).map((item) => {
          return { time: formatTime(item.time), text: item.context || "" }
        })
      }
    } else {
      // API 返回错误或格式不符
      const errorMsg = data && data.desc ? data.desc : "查询失败，请检查运单号"
      return {
        ready: false,
        title: trackingNo,
        subtitle: "查询失败",
        message: errorMsg,
        status: "",
        details: []
      }
    }
  }).catch((err) => {
    return {
      ready: false,
      title: trackingNo,
      subtitle: "查询出错",
      message: "网络请求失败: " + err.message,
      status: "",
      details: []
    }
  })
}

export function getTodayInHistory() {
  return request({
    url: "https://tmini.net/api/today?type=json"
  }).then((data) => {
    if (!data || data.code !== 200 || !data.events) {
      return []
    }
    return data.events.slice(0, 5).map((item) => {
      return {
        title: item.title || "",
        year: item.year || "",
        desc: item.desc || "",
        link: item.link || ""
      }
    })
  }).catch(() => {
    return []
  })
}
