import fetch from "@system.fetch"

const CURRENTS_API_KEY = "I_gqH5IB0yC8eS7mhIVx7LmQkx2IpDOtmCI6WTsksar1EFbA"
const CURRENTS_BASE_URL = "https://api.currentsapi.services/v1"

const PROVIDERS = {
  weather: {
    name: "聚合数据-全国天气预报",
    url: "http://apis.juhe.cn/simpleWeather/query",
    key: "",
    note: "申请 juhe.cn 天气 key 后填写，可按城市查询实时天气。"
  },
  express: {
    name: "聚合数据-全球快递物流查询",
    url: "http://v.juhe.cn/exp/index",
    key: "",
    note: "申请 juhe.cn 快递 key 后填写，可按快递公司编码和单号查询。"
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

  console.info("[InfoPlat] >>> Request [" + method + "]: " + url)

  return new Promise((resolve, reject) => {
    let isCompleted = false

    const timeoutId = setTimeout(() => {
      if (!isCompleted) {
        isCompleted = true
        console.error("[InfoPlat] !!! Request Timeout (60s): " + url)
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
        console.info("[InfoPlat] <<< Response Code: " + code + " for " + url)

        let data = res.data
        if (responseType === "json" && typeof data === "string") {
          data = parseData(data)
        }

        if (code >= 200 && code < 300) {
          resolve(data)
        } else {
          console.error("[InfoPlat] !!! Request HTTP Error: " + code + " Data: " + JSON.stringify(data))
          reject(new Error("HTTP " + code))
        }
      },
      fail(data, code) {
        if (isCompleted) return
        isCompleted = true
        clearTimeout(timeoutId)

        console.error("[InfoPlat] !!! Request Failed: Code " + code + " Msg: " + data)
        reject(new Error("Fetch failed: " + code))
      }
    })
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

function normalizeNews(item) {
  if (!item) return null
  const category = item.category && item.category.length ? item.category.join(" / ") : "Currents"
  return {
    id: item.id || "",
    title: stripHtmlAndFilter(item.title) || "未命名新闻",
    description: stripHtmlAndFilter(item.description) || "暂无摘要",
    source: item.author || category,
    category: category,
    url: item.url || "",
    published: item.published || ""
  }
}

export function getLatestNews(options) {
  const params = options || {}
  const categories = params.categories && params.categories.length ? params.categories.join(",") : ""

  var queryObj = {
    language: "zh",
    country: "CN",
    page_size: params.pageSize || 40,
    apiKey: CURRENTS_API_KEY.trim()
  }
  if (categories) {
    queryObj.category = categories
  }

  const query = encodeQuery(queryObj)

  return request({
    url: CURRENTS_BASE_URL + "/search?" + query
  }).then((data) => {
    if (!data || data.status !== "ok" || !data.news) {
      console.error("[InfoPlat] News data status not ok: " + (data ? data.status : "null"))
      return []
    }
    return data.news.map(normalizeNews).filter(i => i !== null)
  })
}

export function getWeather(city) {
  const provider = PROVIDERS.weather
  if (!provider.key) {
    return Promise.resolve({
      ready: false,
      title: "天气服务待配置",
      subtitle: provider.name,
      message: provider.note,
      details: ["默认城市：北京", "接口字段：city + key", "接入后显示温度、天气、湿度、风向"]
    })
  }

  const query = encodeQuery({
    city: city,
    key: provider.key
  })
  return request({
    url: provider.url + "?" + query
  }).then((data) => {
    const realtime = data && data.result ? data.result.realtime : null
    return {
      ready: true,
      title: city,
      subtitle: realtime ? realtime.info : "实时天气",
      message: realtime ? realtime.temperature + "°C" : "天气数据暂不可用",
      details: realtime
        ? ["湿度 " + realtime.humidity, "风向 " + realtime.direct, "空气质量 " + realtime.aqi]
        : ["暂无详情"]
    }
  })
}

export function getExpress(companyCode, number) {
  const provider = PROVIDERS.express
  if (!provider.key || !number) {
    return Promise.resolve({
      ready: false,
      title: "快递服务待配置",
      subtitle: provider.name,
      message: provider.note,
      details: ["默认公司编码：sf", "接口字段：com + no + key", "接入后显示最新物流轨迹"]
    })
  }

  const query = encodeQuery({
    com: companyCode,
    no: number,
    key: provider.key
  })
  return request({
    url: provider.url + "?" + query
  }).then((data) => {
    const list = data && data.result ? data.result.list || [] : []
    const first = list.length ? list[0] : null
    return {
      ready: true,
      title: number,
      subtitle: companyCode,
      message: first ? first.remark : "物流数据暂不可用",
      details: list.slice(0, 3).map((item) => item.datetime + " " + item.remark)
    }
  })
}
