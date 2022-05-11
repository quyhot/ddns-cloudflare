// const cfddns = require('nodejs-cloudflare-ddns-script')
const request = require('request-promise')
const cfddns = require('./cloudfareHelper')
const IpFile = process.env.MY_IP || './ip.txt'
const zoneFile = process.env.MY_ZONEFILE || './zonename.json'
const SYNC_TIME = process.env.SYNC_TIME || 2000
const CFKEY = process.env.CFKEY_CL || ''
const emailCL = process.env.CFKEY_CL || ''
const fs = require('fs');
const updateDDNS = (zone) => {
    const options = {
        "wanIPv4Site": "https://ipv4.icanhazip.com",
        // The website which used to get your current public IPv4 address.
        // Default: https://ipv4.icanhazip.com
        "autoSwitch": false,
        //If you don't have any public IPv6 address
        //program will use IPv4 automaticly or it will throw an exception.
        //Default: false.
        "cfKey": CFKEY,
        //Your Cloudflare API key
        "email": emailCL,
        //Your Cloudflare email
        "zoneName": zone.zonename,
        //Your Cloudflare zone name
        "recordType": "A",
        //The type of record you want to update.
        //Default: A
        "recordName": "ddns",
        //The name of the record you want to update.
        "TTL": 60,
        //The TTL of the record you want to update.
        //Default: 60
        "proxied": zone.proxied
    }
    cfddns.update(options)
        .then((ret) => {
            console.log(ret);	//true | false
        })
        .catch((err) => {
            console.error(err);
        });
}

const checkIp = async () => {
    try {
        const url = "https://ipv4.icanhazip.com"
        const options = {
            method: 'GET',
            uri: `${url}`,
        }
        const data = await request(options)
        return {statusCode: 200, data}
    } catch (e) {
        const {name, statusCode, error} = e
        if (name === 'StatusCodeError') {
            return {data: error, statusCode, msg: (error || {}).msg || ''}
        }
        console.error(e)
        return {statusCode: 400, msg: ''}
    }
}

const writeFile = async (input) => {
    try {
        return fs.writeFileSync(IpFile, input, {encoding: 'utf8', flag: 'w+'})
    } catch (e) {
        return e.code
    }
}

const readFile = async (fileName) => {
    try {
        return fs.readFileSync(fileName, {encoding: 'utf8', flag: 'r'})
    } catch (e) {
        return e.code
    }
}

const writeIpToFile = async () => {
    const ip = await checkIp()
    const text = ip.data.replace(/(\r\n|\n|\r)/gm, "")
    await writeFile(text)
    setTimeout(handle, SYNC_TIME)
}

const readZoneArr = async () => {
    return JSON.parse(await readFile(zoneFile))
}

const handle = async () => {
    try {
        const ip = await checkIp()
        const text = ip.data.replace(/(\r\n|\n|\r)/gm, "")
        const data = await readFile(IpFile)
        if (text !== data) {
            await writeIpToFile()
            const zoneArr = await readZoneArr()
            for (const zone of zoneArr) {
                await updateDDNS(zone)
            }
        }
        setTimeout(handle, SYNC_TIME)
    } catch (e) {
        console.error(e)
    }
}

const start = async () => {
    await handle()
}

start()
