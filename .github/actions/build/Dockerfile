FROM centos:7

RUN yum install -y https://rpm.nodesource.com/pub_16.x/el/7/x86_64/nodesource-release-el7-1.noarch.rpm && \
  yum install -y gcc-c++ make nodejs nodejs-devel && \
  yum clean all && \
  rm -rf /var/cache/yum

COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
