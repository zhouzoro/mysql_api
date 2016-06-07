var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var _ = require('lodash');
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123qwe',
    database: 'gis1'
});
var jade = require('jade');
var fs = require('fs');
var path = require('path');
var popJade = jade.compileFile(path.join(__dirname, '/../views/popup.jade'));

var colData = {
    tname: 'authorizing',
    cols: {
        progress_status: [87, 142, 18],
        reclaiming: [17, 39],
        rec_status: [15, 40],
        submit_status: [53, 33, 14],
        monitoring: [39, 61],
        legal_status: [21, 79],
        ajust_status: [77, 23],
        ajust_submit_status: [19, 81],
        ajust_approval_status: [17, 83],
        auth_certified_status: [29, 71],
        benif_submit_status: [14, 86],
        benif_approval_status: [27, 83],
    }
}

//generateStats(colData);

//generateProjDates();

function exq(qstr, res) {

    connection.query(qstr, function(err, rows, fields) {
        if (err) console.log(err);

        res.send(rows);
    });

}
/* GET home page. */
router.get('/exq?', function(req, res, next) {
    exq(req.query.qs, res);
});

router.get('/zone_count?', function(req, res) {
    var qstr = "SELECT `确权区域ID` as zone, count(`确权区域ID` = `确权区域ID`) as count FROM gis1.projects where`" + req.query.field + "`= '" + req.query.val + "' group by `确权区域ID`";
    console.log(qstr);
    exq(qstr, res);
});

router.get('/project?', function(req, res) {

    var qstr = "SELECT * FROM gis1.projects where id = " + req.query.id;
    connection.query(qstr, function(err, rows) {
        if (err) {
            console.log(err);
        }
        res.render('project', { data: rows });
    });
});
router.get('/get_projects?', function(req, res) {

    var qstr = "SELECT * FROM gis1.projects where `确权区域ID` = " + req.query.zone;
    if (req.query.field) {
        qstr = qstr + " and `" + req.query.field + "`= '" + req.query.val + "'";
    }
    connection.query(qstr, function(err, rows) {
        if (err) {
            console.log(err);
        }
        res.render('projects', { data: rows });
    });
});

router.get('/edit_project?', function(req, res) {

    var qstr = "SELECT * FROM gis1.projects where `id` = " + req.query.id;

    connection.query(qstr, function(err, rows) {
        if (err) {
            console.log(err);
        }
        res.render('editProject', { data: rows });
    });
});

router.get('/delete_project?', function(req, res) {

    var qstr = "delete FROM gis1.projects where `id` = " + req.query.id;

    connection.query(qstr, function(err, rows) {
        if (err) {
            console.log(err);
        }
        res.send({ ok: 1 });
    });
});
router.post('/edit_project', function(req, res) {

    var qstr = "update gis1.projects set";
    for (let key in req.body) {
        if (key !== 'id') {
            qstr = qstr + " `" + key + "` = '" + req.body[key] + "',"
        }
    }
    qstr = qstr.substring(0, qstr.lastIndexOf(",")) + "where `id` = " + req.body.id;
    connection.query(qstr, function(err, rows) {
        if (err) {
            console.log(err);
        }
        res.send({ ok: 1, id: req.body.id })
    });
});

function writeCsv(arr, csvPath) {
    var wstream = fs.createWriteStream(csvPath);

    var header = '';
    for (key in arr[0]) {
        header = header + key + ',';
    }
    wstream.write(header.substring(0, header.length - 1) + '\n', 'utf8');

    for (obj of arr) {
        var row = '';
        for (key in obj) {
            row = row + obj[key] + ',';
        }
        wstream.write(row.substring(0, row.length - 1) + '\n', 'utf8');
    }

    wstream.end();
    console.log('csv ready');
}

router.get('/search?', function(req, res, next) {
    var qstr1 = "select *, match (项目名称,项目进展情况,填海情况,填海超面积情况,海域使用上报情况,动态监测情况,违法情况,用海调整情况,调整上报情况,调整上报审批情况,确权发证情况,受益方上报情况,受益方上报审批情况) against('" + req.query.q + "') as relevance from gis1.projects order by relevance desc";
    var qstr2 = "select *, match (配号来源,用海一级类,用海二级类,用海方式) against('" + req.query.q + "') as relevance from gis1.authorizing order by relevance desc";
    console.log(qstr2);
    Promise.all([queryAsync(qstr1), queryAsync(qstr2)]).then(function(rows) {

        var csvname = Date.now() + '_1.csv';
        var csvname1 = Date.now() + '_2.csv';
        res.send({ rows: [rows[0].slice(0, 5), rows[1].slice(0, 5)], counts: [rows[0].length, rows[1].length], csvs: csvname + ',' + csvname1 });

        writeCsv(rows[0], path.join(__dirname, '../public/csv/' + csvname));
        writeCsv(rows[1], path.join(__dirname, '../public/csv/' + csvname1));

    }).catch(function(err) {
        console.log(err);
    });

});

router.post('/search?', function(req, res) {

    var qstr = "select from gis1." + req.query.tb;
    var nowhere = 1;
    var noand = 1;
    for (let key in req.body) {
        if (req.body[key]) {
            if (nowhere) {
                qstr = qstr + " where";
                nowhere = 0;
            }
            if (noand && !nowhere) {
                qstr = qstr + " and";
                noand = 0;
            }
            qstr = qstr + " `" + key + "` = '" + req.body[key] + "'";
        }
    }
    qstr = qstr.substring(0, qstr.lastIndexOf(",")) + "where `id` = " + req.body.id;
    connection.query(qstr, function(err, rows) {
        if (err) {
            console.log(err);
        }
        res.send({ ok: 1, id: req.body.id })
    });
});
router.post('/update', function(req, res, next) {
    console.log(req.body);
});

router.get('/popup_content?', function(req, res, next) {
    var qstr = 'select * from authorizing where id = ' + req.query.id;
    console.log(qstr);
    connection.query(qstr, function(err, rows, fields) {
        if (err) console.log(err);
        console.log(rows[0]);
        var htmlStr = popJade({ data: rows[0] });
        res.send(htmlStr);
    });
});

router.get('/download?', function(req, res, next) {
    var csvPath = path.join(__dirname, '../csv/' + Date.now() + '.csv');
    var wstream = fs.createWriteStream(csvPath);
    return csvPath;
});

function generateProjDates() {
    queryAsync('select id from authorizing').then(function(ids) {
        for (let objid of ids) {
            generateDate(objid.id);
        }
    })
}

function generateDate(id) {
    var yearRnd = getProbsFromVals([29, 43, 94, 87, 97, 144, 122]).getRandInt();
    var monthRnd = getProbsFromVals([29, 43, 97, 144, 159]).getRandInt();
    var dateRnd = (2010 + yearRnd) + '-' + (2 + monthRnd) + '-01';
    queryAsync('update authorizing set init_date = "' + dateRnd + '" where id = ' + id);
}

function generateProjects() {
    console.log('stg 1');
    queryAsync('select id from authorizing').then(function(ids) {
        for (let objid of ids) {
            generateAuthProj(objid.id);
        }
    })
}

function generateAuthProj(auth_zone) {
    console.log('stg 2');
    var projsInAuth = getProbsFromVals([7, 123, 26, 17, 3]).getRandInt();
    console.log(projsInAuth);
    while (projsInAuth--) {
        generateOneProj(auth_zone);
    }
}

function generateOneProj(auth_zone) {
    console.log('stg 3');
    queryAsync('insert into projects (auth_zone) values (' + auth_zone + ')').then(function(rows) {
        console.log(rows);
    });
}

function generateStats(colData) {
    console.log('stg 1');
    for (let cname in colData.cols) {
        genetateColumn(colData.tname, cname, colData.cols[cname])
    }
}

function genetateColumn(tname, cname, values) {
    console.log('stg 2');
    console.log(values);
    var updateCols = updateColVals(tname, cname, values);
    queryAsync('select count(*) as count from ' + tname)
        .then(updateCols)
        .catch(function() {
            console.log(err);
        });
}

function updateColVals(tname, cname, values) {
    return function(csumRows) {
        console.log('stg 3');
        var csum = csumRows[0].count;
        var probs = getProbsFromVals(values);
        while (csum--) {
            var val = probs.getRandInt();
            updateCol(tname, cname, csum, val);
        }
    }
}

function updateCol(tname, cname, id, val) {

    console.log('stg 4');
    var execUpdate = queryAsync('update ' + tname + ' set ' + cname + ' = ' + val + ' where id = ' + id);
    execUpdate.then(function(rows) {
        console.log('updated row: ' + tname + ' ' + cname + ' ' + id + ' ' + val + ';');
    }).catch(function() {
        console.log(err);
    });
}

function getRandFromVals(values) {
    return getRandInt(getProbsFromVals(values));
}

function getProbsFromVals(values) {
    var total = values.reduce(function(a, b) {
        return a + b;
    });
    var probs = [];
    var i = values.length;
    while (i--) {
        var prob = values[i] / total;
        probs[i] = probs[i] ? probs[i] + prob : prob;
        var j = i;
        while (j--) {
            probs[j] = probs[j] ? probs[j] : 0;
            probs[j] += prob;
        }
    }
    return {
        getRandInt: function() {
            var randVal = Math.random();
            var i = probs.length;
            while (i--) {
                if (randVal < probs[i]) {
                    return i;
                }
            }
        }
    }
}

function getRandInt(probs) {
    var randVal = Math.random();
    var i = probs.length;
    while (i--) {
        if (randVal < probs[i]) {
            return i;
        }
    }
}

function queryAsync(qstr) {
    return new Promise(function(resolve, reject) {
        connection.query(qstr, function(err, rows) {
            if (err) {
                console.log(err);
                reject(err);
            }
            resolve(rows);
        });
    })
}

module.exports = router;
