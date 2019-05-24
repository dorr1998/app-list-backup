$(function() {
  function filterSize(t) {
    return (t / 1024 / 1024).toFixed(2) + "MB";
  }
  function filterTime(t) {
    var time = new Date(+t);
    return time.getFullYear() + "-" + (time.getMonth() + 1) + "-" + time.getDate();
  }
  function filterName(t) {
    return t[0].toUpperCase() + t.slice(1, t.length);
  }
  function getQuery() {
    var match,
      pl = /\+/g, // Regex for replacing addition symbol with a space
      search = /([^&=]+)=?([^&]*)/g,
      decode = function(s) {
        return decodeURIComponent(s.replace(pl, " "));
      },
      query = window.location.search.substring(1);

    urlParams = {};
    while ((match = search.exec(query))) urlParams[decode(match[1])] = decode(match[2]);

    return urlParams;
  }

  var act = {
    index: function(cont, selected) {
      var search_keyword = "";
      var page = 1;
      var flag = 2;
      var inAjax = false;
      var total = 1;
      var loading = $('<div class="loading"></div>');
      var empty = $('<div class="empty"></div>');
      var nomore = $('<div class="nomore">no more apps.</div>');
      var page_height = 0;
      var win_height = 0;

      function renderList(list) {
        var str = "";

        for (var i = 0; i < list.length; i++) {
          str +=
            '<div class="list-item">\
              <a class="cover" href="detail.html?id=' +
            list[i].id +
            "&code=" +
            encodeURIComponent(list[i].versionCode) +
            "&name=" +
            encodeURIComponent(list[i].appName) +
            "&pic=" +
            encodeURIComponent(list[i].icon) +
            '"></a>\
              <img src="' +
            list[i].icon +
            '" />\
              <a class="view" href="detail.html?id=' +
            list[i].id +
            "&code=" +
            encodeURIComponent(list[i].versionCode) +
            "&name=" +
            encodeURIComponent(list[i].appName) +
            "&pic=" +
            encodeURIComponent(list[i].icon) +
            '">View</a>\
              <h6>' +
            filterName(list[i].appName) +
            "</h6>\
              <p>v" +
            list[i].versionCode +
            "<em></em>" +
            filterSize(list[i].appSize) +
            "</p>\
              <p>" +
            filterTime(list[i].createTime) +
            "</p>\
            </div>";
        }

        if (flag === 1) {
          selected.cont2.append(str);
        } else {
          selected.cont1.append(str);
        }

        if (page < total) {
          if (flag === 1) {
            selected.cont2.append(loading);
          } else {
            selected.cont1.append(loading);
          }
        }

        setTimeout(function() {
          page_height = document.body.scrollHeight;
          win_height = window.innerHeight;
          if (page >= total) {
            if (flag === 1) {
              selected.cont2.append(nomore);
            } else {
              selected.cont1.append(nomore);
            }
            loading.remove();
          } else {
            scrollCheck();
          }
        }, 500);
      }

      function changeList(force) {
        if (inAjax && !force) return;
        inAjax = true;

        if (flag === 1) {
          selected.move.css({ transform: "translate3d(" + -1 * (window.innerWidth > 900 ? 900 : window.innerWidth) + "px,0,0)" });
          selected.cont2.append(loading);
        } else {
          selected.move.css({ transform: "translate3d(0px,0,0)" });
          selected.cont1.append(loading);
        }

        setTimeout(function() {
          var search_params = { flag: flag, pageSize: 12, page: page };

          if (search_keyword) {
            search_params.appName = search_keyword;
          }

          $.get("/appList/web/app/findAppList", search_params, function(data) {
            if (!force && search_keyword !== "") {
              return;
            }

            inAjax = false;

            if (page === 1) {
              selected.cont2.empty();
              selected.cont1.empty();
            }

            loading.remove();

            if (+data.code === 1000) {
              total = data.data.total / 10;
              renderList(data.data.rows);
            } else {
              empty.html(data.message);
              if (flag === 1) {
                selected.cont2.html(empty);
              } else {
                selected.cont1.html(empty);
              }
            }
          });
        }, 600);
      }

      function changeClass(t) {
        t.addClass("o")
          .siblings()
          .removeClass("o");

        selected.htmlbody.animate({
          scrollTop: 0
        });
      }

      function scrollCheck() {
        if (inAjax || page >= total) return;

        if (selected.htmlbody.scrollTop() > page_height - win_height - 250) {
          page = page + 1;
          changeList();
        }
      }

      function bind() {
        // 绑定所有可能的按钮
        selected.name.on("click", function() {
          flag = 1;
          page = 1;
          inAjax = false;
          changeClass($(this));
          changeList();
        });
        selected.date.on("click", function() {
          flag = 2;
          page = 1;
          inAjax = false;
          changeClass($(this));
          changeList();
        });

        selected.date.trigger("click");
        $(window).on("scroll", scrollCheck);

        selected.close.on("click", function() {
          search_keyword = "";
          selected.search.val("");
          changeList();
          selected.sugg.hide();
          selected.close.hide();
        });

        var timer = null;
        selected.search
          .on("focus", function() {
            selected.sugg.show();
            selected.close.show();
          })
          .on("blur", function() {
            setTimeout(function() {
              selected.sugg.hide();
              selected.close.hide();
            }, 150);
          })
          .on("keyup", function(event) {
            var t = $(this).val();
            if (t) {
              if (event.keyCode === 13) {
                search_keyword = t;
                $(this).blur();
                changeList(true);
              } else {
                selected.sugg.html('<li class="search-empty"><em class="loading"></em></li>');
                clearTimeout(timer);
                timer = setTimeout(function() {
                  searchAjax(t, function(d) {
                    selected.sugg.html(d);
                  });
                }, 500);
              }
            } else {
              selected.sugg.html('<li class="search-empty">empty list.</li>');
            }
          });
      }

      function searchAjax(search, callback) {
        $.get("/appList/web/app/findAppList", { appName: search, flag: flag, pageSize: 5, page: 1 }, function(data) {
          if (+data.code === 1000) {
            if (data.data.rows.length) {
              var str = "";
              for (var i = 0; i < data.data.rows.length; i++) {
                str +=
                  '<li><a href="detail.html?id=' +
                  data.data.rows[i].id +
                  "&code=" +
                  encodeURIComponent(data.data.rows[i].versionCode) +
                  "&name=" +
                  encodeURIComponent(data.data.rows[i].appName) +
                  "&pic=" +
                  encodeURIComponent(data.data.rows[i].icon) +
                  '">' +
                  data.data.rows[i].appName +
                  "<span>v" +
                  data.data.rows[i].versionCode +
                  "</span></a></li>";
              }
              callback(str);
            } else {
              callback('<li class="search-empty">no result for: <span style="color: red;">' + search + "</span></li>");
            }
          } else {
            callback('<li class="search-empty">' + data.message + "</li>");
          }
        });
      }

      bind();
    },

    detail: function(cont, selected) {
      var q = getQuery();
      var list = {};
      var is_first = true;

      selected.pic.attr("src", q.pic);
      selected.name.html(q.name);

      function renderPage() {
        selected.detail.html("-");
        selected.summary.html("-");
        selected.install.attr("href", "");
        selected.download.attr("href", "");
        selected.qr.attr("data-link", "");

        setTimeout(
          function() {
            var str =
              "v" + list[q.code].versionCode + "<em></em>" + filterSize(list[q.code].appSize) + "<em></em>" + filterTime(list[q.code].createTime);

            selected.detail.html(str);
            selected.summary.html(list[q.code].versionInfo);
            selected.install.attr("href", list[q.code].appUrl);
            selected.download.attr("href", list[q.code].appUrl);
            selected.qr.attr("data-link", list[q.code].appUrl);
          },
          is_first ? 10 : 500
        );
        is_first = false;

        selected.htmlbody.scrollTop(0);
      }

      function renderData(data) {
        selected.version.empty();

        for (var i = 0; i < data.length; i++) {
          list[data[i].versionCode] = data[i];
        }

        for (var i in list) {
          selected.version.append(
            '<a class="' +
              (i === q.code ? "o" : "") +
              '" data-id="' +
              list[i].versionCode +
              '" href="detail.html?id=' +
              q.id +
              "&code=" +
              encodeURIComponent(list[i].versionCode) +
              "&name=" +
              encodeURIComponent(q.name) +
              "&pic=" +
              encodeURIComponent(q.pic) +
              '">v' +
              list[i].versionCode +
              "<span><b>updated:</b> " +
              filterTime(list[i].createTime) +
              "</span></a>"
          );
          renderPage();
        }
      }

      function showPop(link) {
        selected.showcode.empty();
        new QRCode(selected.showcode.get(0), {
          text: link,
          width: 230,
          height: 230,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });
        selected.pop.show();
      }

      function bind() {
        selected.version.on("click", "a", function(event) {
          if (window.history.replaceState) {
            event.preventDefault();
            window.history.replaceState("", q.name + " " + $(this).attr("id"), $(this).attr("href"));
            $(this)
              .addClass("o")
              .siblings()
              .removeClass("o");
            q = getQuery();
            renderPage();
          }
        });

        selected.qr.on("click", function() {
          var t = $(this).attr("data-link");

          if (t) showPop(t);
        });

        selected.pop.on("click", function() {
          $(this).hide();
        });
        selected.pop.children("div").on("click", function(event) {
          event.stopPropagation();
        });
      }

      $.get("/appList/web/app/findAppDetail", { appId: q.id }, function(data) {
        if (+data.code === 1000) {
          renderData(data.data);
          bind();
        } else {
          alert("Can't find the Apps.");
        }
      });
    },

    back: function(cont) {
      cont.on("click", function() {
        window.location.href = "/";
      });
    }
  };

  var all_target = $("[data-fuc]");
  all_target.each(function(index, target) {
    var a = target.getAttribute("data-fuc");
    target = $(target);

    if (act[a])
      act[a](
        target,
        (function() {
          var child = target.find("*");
          var selected = {
            htmlbody: $("html,body")
          };

          child.each(function(index, el) {
            var cls = el.className;

            if (!/js-[a-z0-9]+/.test(cls)) return;
            var m = cls.match(/js-[a-z0-9]+/)[0];
            m = m.split("-");
            selected[m[1]] = $(el);
          });

          return selected;
        })()
      );
  });
});
