import fetch from "@system.fetch"

const CURRENTS_API_KEY = "I_gqH5IB0yC8eS7mhIVx7LmQkx2IpDOtmCI6WTsksar1EFbA"
const CURRENTS_BASE_URL = "https://api.currentsapi.services/v1"

const PROVIDERS = {
  weather: {
    name: "UApiPro",
    url: "https://uapis.cn/api/v1/misc/weather",
    key: "",
    note: "UApiPro天气API，支持中文城市名直接查询。"
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

    console.log("request: " + method + " " + url)
    fetch.fetch({
      url: url,
      method: method,
      header: options.header || {},
      responseType: responseType,
      success(res) {
        console.log("request success: code=" + (res.code || res.statusCode) + ", url=" + url)
        if (isCompleted) return
        isCompleted = true
        clearTimeout(timeoutId)

        const code = res.code || res.statusCode

        // 兼容：先尝试 res.data，再尝试 res.result（不同 quickapp 实现可能不同）
        let data = res.data !== undefined ? res.data : res.result

        // 无论如何都尝试 parse，防止 responseType json 未生效
        if (typeof data === "string") {
          data = parseData(data)
        }

        if (code >= 200 && code < 300) {
          resolve(data)
        } else if (data && typeof data === "object" && Object.keys(data).length > 0) {
          // fallback: 响应体存在且是非空对象，直接使用
          resolve(data)
        } else {
          reject(new Error("HTTP " + code))
        }
      },
      fail(data, code) {
        if (isCompleted) return
        isCompleted = true
        clearTimeout(timeoutId)
        console.log("request fail: code=" + code + ", url=" + url + ", data=" + JSON.stringify(data))

        reject(new Error("Fetch failed: " + code))
      }
    })
  })
}

/**
 * Fetch raw text/html
 */
export function fetchText(url) {
  return new Promise(function (resolve, reject) {
    var isCompleted = false
    var timeoutId = setTimeout(function () {
      if (!isCompleted) {
        isCompleted = true
        reject(new Error("Timeout"))
      }
    }, 60000)

    fetch.fetch({
      url: url,
      method: "GET",
      header: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Mobile Safari/537.36"
      },
      success: function (res) {
        if (isCompleted) return
        isCompleted = true
        clearTimeout(timeoutId)

        var code = res.code || res.statusCode
        var data = res.data !== undefined ? res.data : res.result
        var headers = res.headers || {}

        console.log("fetchText 响应 code=" + code + ", url=" + url + ", headers=" + JSON.stringify(headers))

        // 处理 3xx 重定向：尝试从 header 中获取 Location
        if (code >= 300 && code < 400) {
          var location = headers["location"] || headers["Location"] || ""
          if (location) {
            console.log("fetchText 重定向到: " + location)
            resolve({ redirect: location })
            return
          }
        }

        // 直接返回原始字符串
        if (typeof data === "string") {
          resolve(data)
        } else if (typeof data === "object" && data !== null) {
          try {
            resolve(JSON.stringify(data))
          } catch (e) {
            resolve("")
          }
        } else {
          resolve("")
        }
      },
      fail: function (data, code) {
        if (isCompleted) return
        isCompleted = true
        clearTimeout(timeoutId)
        console.log("fetchText fail: code=" + code + ", url=" + url + ", data=" + JSON.stringify(data))

        reject(new Error("Fetch failed: " + code))
      }
    })
  })
}

function decodeHtmlEntities(text) {
  if (!text) return ""
  var map = {
    "nbsp": " ", "ensp": " ", "emsp": " ", "thinsp": " ",
    "quot": "\"", "apos": "'", "lt": "<", "gt": ">",
    "amp": "&",
    "mdash": "—", "ndash": "–", "hellip": "…",
    "lsquo": "‘", "rsquo": "’",
    "ldquo": "“", "rdquo": "”",
    "copy": "©", "reg": "®", "trade": "™",
    "times": "×", "divide": "÷",
    "deg": "°", "plusmn": "±", "micro": "µ",
    "para": "¶", "middot": "·",
    "laquo": "«", "raquo": "»",
    "larr": "←", "uarr": "↑", "rarr": "→", "darr": "↓",
    "bull": "•", "star": "★",
    "lrm": "", "rlm": "", "zwnj": "", "zwj": ""
  }
  // 命名实体（有无分号都匹配）
  text = text.replace(/&([a-zA-Z]+);?/g, function (m, name) {
    var val = map[name]
    return val !== undefined ? val : m
  })
  // 数字实体 &#123; 或 &#123
  text = text.replace(/&#(\d+);?/g, function (m, code) {
    var n = parseInt(code, 10)
    return (n >= 32 && n <= 65535) ? String.fromCharCode(n) : m
  })
  // 十六进制实体 &#x1A; 或 &#x1a
  text = text.replace(/&#x([0-9a-fA-F]+);?/g, function (m, hex) {
    var n = parseInt(hex, 16)
    return (n >= 32 && n <= 65535) ? String.fromCharCode(n) : m
  })
  return text
}

function stripHtmlAndFilter(text) {
  if (!text) return ""
  // 先解码实体，再剥标签
  let cleanText = decodeHtmlEntities(text)
  cleanText = cleanText.replace(/<[^>]+>/g, " ")

  let lines = cleanText.split(/[\r\n]+/)
  let filteredLines = lines.filter((line) => line.indexOf("⬅️") === -1)

  return filteredLines.join("\n").trim()
}

function cleanDescription(text) {
  if (!text) return ""
  var cleaned = decodeHtmlEntities(text)
  // 剥 HTML 标签
  cleaned = cleaned.replace(/<[^>]+>/g, " ")
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
  var query = encodeQuery({
    city: city,
    extended: true,
    forecast: true,
    indices: true
  })

  return request({
    url: PROVIDERS.weather.url + "?" + query
  }).then((data) => {
    if (!data || !data.city) {
      return {
        ready: false,
        title: city,
        subtitle: "查询失败",
        message: "天气数据暂不可用",
        details: [],
        detailsExtra: [],
        indexes: [],
        forecasts: [],
        alerts: []
      }
    }

    var temp = data.temperature !== undefined ? data.temperature : "--"
    var desc = data.weather || "未知"
    var feelsLike = data.feels_like !== undefined ? data.feels_like : "--"
    var humidity = data.humidity !== undefined ? data.humidity + "%" : "--"
    var windDir = data.wind_direction || "--"
    var windPower = data.wind_power || "--"
    var clouds = data.cloud !== undefined ? data.cloud + "%" : "--"
    var vis = data.visibility !== undefined ? data.visibility + "km" : "--"
    var pressure = data.pressure !== undefined ? data.pressure + "hPa" : "--"
    var district = data.city || city
    var aqi = data.aqi || 0
    var pm25 = data.air_pollutants ? data.air_pollutants.pm25 : 0
    var pm10 = data.air_pollutants ? data.air_pollutants.pm10 : 0

    // 生活指数
    var indexes = []
    if (data.life_indices) {
      var indices = data.life_indices
      var indexNames = {
        "clothing": "穿衣",
        "uv": "紫外线",
        "car_wash": "洗车",
        "drying": "晾晒",
        "air_conditioner": "空调",
        "cold_risk": "感冒",
        "exercise": "运动",
        "comfort": "舒适度",
        "travel": "出行",
        "fishing": "钓鱼",
        "allergy": "过敏",
        "sunscreen": "防晒",
        "mood": "心情",
        "beer": "啤酒",
        "umbrella": "雨伞",
        "traffic": "交通",
        "air_purifier": "空气净化器",
        "pollen": "花粉"
      }
      for (var key in indices) {
        if (indices[key] && indices[key].brief) {
          indexes.push({
            name: indexNames[key] || key,
            brief: indices[key].brief,
            detail: indices[key].advice || ""
          })
        }
      }
    }

    // 7天预报
    var forecasts = []
    if (data.forecast) {
      for (var i = 0; i < data.forecast.length && i < 7; i++) {
        var f = data.forecast[i]
        forecasts.push({
          day: f.week || "--",
          info: (f.weather_day || "--") + "/" + (f.weather_night || "--") + " " + (f.temp_min || "--") + "~" + (f.temp_max || "--") + "°C"
        })
      }
    }

    // 预警
    var alerts = []
    if (data.alerts) {
      for (var j = 0; j < data.alerts.length; j++) {
        var alert = data.alerts[j]
        alerts.push({
          title: alert.type + alert.level + " 正在生效",
          alertTitle: alert.title || "",
          desc: alert.text || ""
        })
      }
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
        { label: "风力", value: windPower }
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
        details: trackingDetails.map((item) => {
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
