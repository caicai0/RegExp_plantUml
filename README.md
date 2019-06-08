# RegExp_plantUml
通过正则的方式导出plantUml,对于源码类的项目具有通用性

	git clone git@github.com:caicai0/RegExp_plantUml.git
	cd RegExp_plantUml
	npm update
修改 app.js 里面的 root 变量为项目目录

	node app.js
因为使用到了java环境，需要先到oracle官网下载java并安装。
plantUml使用到了graphviz安装方法如下

	brew install Graphviz
`brew`是homebrew命令如果没有安装可以使用命令安装：

	/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"

其中主要思路是通过正则表达式识别并获取继承关系或是遵守关系，然后按照plantuml语法输出到`.puml`文件中。最终通过`plantuml.jar`处理成一张`.svg`矢量图，通过浏览器可以观看。