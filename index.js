const axios = require("axios");
const fs = require("fs");
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

let file_name_read = "proxy.txt";
let file_name_save = "proxy_save.txt";
let url = null;
let url_parsed = null;
let protocols = [
    "http",
    "https",
    "socks4",
    "socks5",
];
const timeouts = [
    1000,
    2000,
    3000,
    4000,
];
let threads_counter = 0;
let valid_buffer = [];


function axios_request(proxy_string) {
    let proxy_split = proxy_string.split(":");
    let proxy_address = proxy_split[0];
    let proxy_port = parseInt(proxy_split[1]);

    for (let key in protocols) {
        let protocol = protocols[key];
        let timeout = timeouts[key];

        setTimeout(() => {
            axios.get(url, {
                proxy: {
                    protocol: protocol,
                    host: proxy_address,
                    port: proxy_port,
                },
                timeout: 15000,
            }).then((res) => {
                threads_counter -= 1;
                result(res, proxy_string, protocol);
            }).catch(error);
        }, timeout);

        threads_counter += 1;
    }
}


function result(res, proxy_string, protocol) {
    if (res.status === 200 && res.data.includes(url_parsed.host) && !res.data.includes("REQUEST_URI")) {
        if (!valid_buffer.includes(proxy_string)) valid_buffer.push(proxy_string);
        console.log(`Найден валидный прокси: ${proxy_string} Протокол: ${protocol}`);
    }
}

function error(err) {
    threads_counter -= 1;
}

function select_protocols(protocols_selected) {
    let new_protocols = [];
    let str_skip = 0;

    for (let key in protocols) {
        let protocol = protocols[key];
        let idx = protocols_selected.indexOf(protocol);
        if (str_skip < idx) str_skip = idx;

        if (idx !== -1) {
            let sub = protocols_selected.substring(idx, protocol.length + 1);

            if (protocol === "http" && sub === "https") continue;

            new_protocols.push(protocol);
        }
    }

    return new_protocols;
}


readline.question("Введите адрес сайта:", site_url => {
    url = site_url;
    url_parsed = new URL(site_url);

    readline.question(`Протоколы: ${protocols.join(",")}?`, protocols_selected => {
        if (protocols_selected.length > 0) protocols = select_protocols(protocols_selected);

        console.log(`Вы выбрали протоколы: ${protocols.join(",")}`);

        readline.question("Берем прокси из файла proxy.txt?", file_read => {
            if (file_read.length > 0) file_name_read = file_read;

            readline.question("Сохраняем в файл proxy_valid.txt?", file_save => {
                if (file_save.length > 0) file_name_save = file_save;

                console.log("Начинаю работу");

                fs.readFile(file_name_read, function(error,data) {
                    if(error) return console.error(error);
                    data = data.toString();
                    let proxies = data.split("\r\n");

                    for (let key in proxies) {
                        let proxy_string = proxies[key];

                        setTimeout(() => {
                            axios_request(proxy_string);
                        }, 1000);
                    }

                    setTimeout(() => {
                        console.log(`Запустил ${threads_counter} потоков`);
                    }, 1500);

                    save_interval();
                });

                readline.close();
            });
        });
    });
});

function save_interval() {
    const interval = setInterval(() => {
        fs.writeFile(file_name_save, valid_buffer.join("\r\n"), function(error) {
            if(error ) return console.error(error);
        });

        if (threads_counter === 0) {
            console.log(`Завершил работу! Найдено прокси: ${valid_buffer.length}`);
            clearInterval(interval);
        }
    }, 5000);
}