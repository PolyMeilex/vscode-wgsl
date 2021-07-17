const gulp = require("gulp");
const yaml = require("gulp-yaml");

gulp.task("yaml", (cb) => {
  gulp
    .src("./syntaxes/*.yml")
    .pipe(yaml({ safe: false, space: 4 }))
    .pipe(
      gulp.dest((f) => {
        return f.base;
      })
    );
  cb();
});

gulp.task(
  "watch-yaml",
  gulp.series("yaml", (cb) => {
    gulp.watch("./syntaxes/*.yml", gulp.series("yaml"));
    cb();
  })
);
