import superagent from "superagent"
import cheerio from "cheerio"
import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat.js"
import ics from "ics"
import { promisify } from "util"
import { writeFile } from "fs/promises"
import ejs from "ejs"

dayjs.extend(customParseFormat)

try {
    const res = await superagent.get("https://www.illc.uva.nl/NewsandEvents/Events/Conferences/")
    const $ = cheerio.load(res.text)
    const events = $("#pagecontents > div > section > section:nth-child(9) .vevent").map((_, li) => {
        const title = $("h4", li).text()
        const uid = "taniguchi.masaya" + $(".uid", li).attr("href")
        const _start = dayjs($(".dtstart", li).attr("title"), "YYYY-MM-DD")
        const _end = dayjs($(".dtend", li).attr("title"), "YYYY-MM-DD")
        const location = $(".location", li).text().replace(/Location:\s*/, '')
        const deadline_src = 
            $("div", li)
                .filter((_, div)=>$(div).text().search(/Deadline:/) >= 0)
                .first()
                .text()
                .replace(/Deadline:\s*[a-zA-Z]+\s*/, '')
        const _deadline = dayjs(deadline_src, "D MMMM YYYY")
        const start = _deadline.format("YYYY-M-D-H-m").split("-")
        const description = $(".description", li).text()
        return {
            _start: _start.isValid() ? _start.format("D MMMM YYYY") : "",
            _end: _end.isValid() ? _end.format("D MMMM YYYY") : "",
            _deadline: _deadline.isValid() ? _deadline.format("D MMMM YYYY") : "",
            start,
            duration: { hours: 24 },
            uid,
            title,
            description,
            location,
        }
    }).toArray()
    const html = await ejs.renderFile("index.ejs", { events })
    writeFile("index.html", html)
    events.forEach(event => {
        delete event._start
        delete event._end
        delete event._deadline
    })
    const deadlines = await promisify(ics.createEvents)(events)
    writeFile("deadlines.ics", deadlines, "utf-8")
} catch (err) {
    console.error(err)
    process.exit(1)
}