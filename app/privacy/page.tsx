import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隐私与资料使用说明",
  description: "了解上传保险资料前的脱敏要求、文件处理方式与联系方式使用范围。",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900 sm:px-8">
      <article className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 leading-8 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-emerald-700">保单避坑助手</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">隐私与资料使用说明</h1>

        <section className="mt-8 space-y-4 text-slate-700">
          <h2 className="text-xl font-bold text-slate-950">上传前请先遮挡敏感信息</h2>
          <p>
            请尽量遮挡姓名、手机号、身份证号、银行卡号、详细住址、病史、体检信息等个人敏感内容。
          </p>
          <p>
            不建议上传身份证、银行卡、病历、体检报告、完整投保单、健康告知、销售聊天记录等包含大量个人隐私的资料。
          </p>
        </section>

        <section className="mt-8 space-y-4 text-slate-700">
          <h2 className="text-xl font-bold text-slate-950">文件如何使用</h2>
          <p>
            你上传的文件将发送至阿里云百炼千问模型，仅用于本次自动识别和生成初步风险提示。系统会在分析完成后请求删除模型侧的临时文件，并对中途离开页面的任务安排延迟清理。
          </p>
          <p>
            当前项目不会主动将上传的保险文件原件保存在网站服务器中。由于网络中断或服务异常可能影响临时文件清理，请务必在上传前完成脱敏。
          </p>
          <p>
            如果你提交微信或邮箱，系统会保存联系方式、你填写的问题、上传文件名和材料类型，方便后续人工整理问题清单。
          </p>
        </section>

        <section className="mt-8 space-y-4 text-slate-700">
          <h2 className="text-xl font-bold text-slate-950">结果边界</h2>
          <p>
            本工具生成内容仅供初步参考，不构成保险建议、法律建议、投资建议、购买建议或退保建议。具体保障责任、现金价值、免责条款、退保金额和理赔条件，请以正式保险合同和保险公司文件为准。
          </p>
        </section>

        <section className="mt-8 space-y-4 text-slate-700">
          <h2 className="text-xl font-bold text-slate-950">访问统计</h2>
          <p>
            为了解页面访问和功能使用效果，本网站使用百度统计记录页面访问及匿名操作事件，例如点击初筛、开始分析、分析成功和点击详细报告意向按钮。
          </p>
          <p>
            统计事件不会主动发送你上传的文件内容、文件名、分析结果、微信号、邮箱或你填写的问题内容。
          </p>
        </section>
      </article>
    </main>
  );
}
