// npm install
// node node_modules\grunt\bin\grunt
module.exports = function (grunt) {
	grunt.initConfig({
		clean: ["public/**/*"],
		copy: {
			main: {
				expand: true,
				cwd: "src",
				src: "**/*",
				dest: "public"
			}
		},
		htmlmin: {
			main: {
				options: {
					collapseWhitespace: true,
					conservativeCollapse: true,
					minifyCSS: true,
					minifyJS: true,
					removeComments: true
				},
				files: [{
					expand: true,
					cwd: "public",
					src: "**/*.html",
					dest: "public"
				}]
			}
		},
		cssmin: {
			main: {
				files: [{
					expand: true,
					cwd: "public",
					src: "**/*.css",
					dest: "public",
				}]
			}
		},
		uglify: {
			main: {
				files: [{
					expand: true,
					cwd: "public",
					src: ["**/*.js", "!jquery.js"],
					dest: "public"
				}]
			}
		},
		connect: {
			main: {
				options: {
					port: 443,
					protocol: "https",
					hostname: "localhost",
					base: "src",
					/*middleware: function() {
						return [
							require("connect-livereload")(),
							require("serve-static")(require("path").resolve("src"))
						];
					}*/
				}
			}
		},
		watch: {
			main: {
				files: ["src/**/*.js", "src/**/*.html", "src/**/*.css"],
				/*tasks: "jsbeautifier",
				options: {
					livereload: true
				}*/
			}
		},
		jsbeautifier: {
			files: ["src/**/*.js", "src/**/*.html", "src/**/*.css", "!src/jquery.js"],
			options: {
				html: {
					indentWithTabs: true
				},
				css: {
					indentWithTabs: true
				},
				js: {
					indentWithTabs: true
				}
			}
		}
	});

	for (var taskName in grunt.file.readJSON("package.json").devDependencies) {
		if (taskName.substring(0, 6) == "grunt-") grunt.loadNpmTasks(taskName);
	}

	grunt.registerTask("default", ["clean", "copy", "htmlmin", "cssmin", "uglify"]);
	grunt.registerTask("serve", ["connect", "watch"]);
};
