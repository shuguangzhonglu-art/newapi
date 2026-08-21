/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
package common

import (
	"bytes"
	"fmt"
	"html/template"
	"strings"
)

type hemaEmailTemplateData struct {
	DocumentTitle string
	HeaderLabel   string
	Eyebrow       string
	Heading       string
	RecipientName string
	Intro         string
	Code          string
	ActionURL     string
	ActionLabel   string
	ContentHTML   template.HTML
	Meta          string
	FooterTag     string
	SiteName      string
}

var hemaEmailTemplate = template.Must(template.New("hema-email").Parse(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>{{.DocumentTitle}}</title>
</head>
<body style="margin:0;padding:0;background:#edf1eb;color:#173c2c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#edf1eb;">
    <tr>
      <td align="center" style="padding:36px 16px 48px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
          <tr>
            <td style="padding:0 2px 12px;color:#718072;font-family:SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:10px;font-weight:700;line-height:1.4;">
              HEMA / {{.HeaderLabel}}
            </td>
            <td align="right" style="padding:0 2px 12px;color:#718072;font-family:SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:10px;font-weight:700;line-height:1.4;">
              SECURE MESSAGE
            </td>
          </tr>
          <tr>
            <td colspan="2" style="height:8px;background:#173c2c;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td colspan="2" style="border:1px solid rgba(23,60,44,0.18);background:#fbfcf8;box-shadow:0 18px 44px rgba(23,60,44,0.09);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:30px 34px 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="42" height="42" align="center" valign="middle" style="width:42px;height:42px;background:#173c2c;color:#ffffff;font-family:SFMono-Regular,Consolas,monospace;font-size:20px;font-weight:800;">
                          H
                        </td>
                        <td style="padding-left:14px;">
                          <div style="margin:0 0 4px;color:#7e8d4a;font-family:SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:10px;font-weight:700;line-height:1.2;">
                            {{.Eyebrow}}
                          </div>
                          <h1 style="margin:0;color:#173c2c;font-size:22px;font-weight:700;line-height:1.3;">
                            {{.Heading}}
                          </h1>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 34px;">
                    <div style="height:1px;background:#cfd8ce;font-size:0;line-height:0;">&nbsp;</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 34px 10px;color:#334b3d;font-size:15px;line-height:1.75;">
                    <p style="margin:0 0 14px;"><strong style="color:#173c2c;">{{.RecipientName}}</strong>，您好：</p>
                    <p style="margin:0;">{{.Intro}}</p>
                  </td>
                </tr>
                {{if .Code}}
                <tr>
                  <td style="padding:18px 34px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid rgba(23,60,44,0.20);background:#f3f6f1;">
                      <tr>
                        <td style="padding:12px 16px 0;color:#718072;font-family:SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:9px;font-weight:700;line-height:1.3;">
                          ONE-TIME VERIFICATION CODE
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding:17px 12px 22px;color:#173c2c;font-family:SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:36px;font-weight:800;line-height:1;letter-spacing:9px;white-space:nowrap;">
                          {{.Code}}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                {{end}}
                {{if .ActionURL}}
                <tr>
                  <td align="center" style="padding:22px 34px 14px;">
                    <a href="{{.ActionURL}}" style="display:inline-block;padding:14px 28px;background:#173c2c;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;line-height:1.2;">{{.ActionLabel}}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 34px 18px;color:#718072;font-size:11px;line-height:1.7;word-break:break-all;">
                    如果按钮无法打开，请复制以下链接到浏览器：<br>
                    <a href="{{.ActionURL}}" style="color:#526f18;text-decoration:underline;">{{.ActionURL}}</a>
                  </td>
                </tr>
                {{end}}
                {{if .ContentHTML}}
                <tr>
                  <td style="padding:18px 34px;">
                    <div style="border:1px solid rgba(23,60,44,0.20);background:#f3f6f1;padding:18px 20px;color:#334b3d;font-size:14px;line-height:1.75;word-break:break-word;">
                      {{.ContentHTML}}
                    </div>
                  </td>
                </tr>
                {{end}}
                {{if .Meta}}
                <tr>
                  <td style="padding:8px 34px 30px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td valign="top" width="10" style="padding-top:7px;">
                          <div style="width:7px;height:7px;border-radius:50%;background:#7e8d4a;">&nbsp;</div>
                        </td>
                        <td style="padding-left:10px;color:#526052;font-size:13px;line-height:1.7;">
                          {{.Meta}}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                {{end}}
                <tr>
                  <td style="padding:20px 34px;border-top:1px solid #dce3da;background:#f5f7f3;color:#718072;font-size:12px;line-height:1.7;">
                    如果这不是您本人发起的操作，请忽略此邮件。您的账户不会因此受到影响。
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 34px 22px;background:#173c2c;color:#b9c5ba;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="color:#ffffff;font-size:13px;font-weight:700;line-height:1.4;">{{.SiteName}}</td>
                        <td align="right" style="color:#b9c5ba;font-family:SFMono-Regular,Consolas,'Liberation Mono',monospace;font-size:9px;line-height:1.4;">{{.FooterTag}}</td>
                      </tr>
                    </table>
                    <p style="margin:10px 0 0;color:#93a195;font-size:10px;line-height:1.6;">此邮件由系统自动发送，请勿直接回复。</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`))

func renderHemaEmail(data hemaEmailTemplateData) (string, error) {
	data.SiteName = SystemName
	if strings.TrimSpace(data.RecipientName) == "" {
		data.RecipientName = "用户"
	}
	var output bytes.Buffer
	if err := hemaEmailTemplate.Execute(&output, data); err != nil {
		return "", fmt.Errorf("render email template: %w", err)
	}
	return output.String(), nil
}

func EmailRecipientName(email string) string {
	localPart, _, found := strings.Cut(strings.TrimSpace(email), "@")
	if !found || localPart == "" {
		return "用户"
	}
	return localPart
}

func RenderVerificationEmail(recipientName string, code string, expiresInMinutes int) (string, error) {
	return renderHemaEmail(hemaEmailTemplateData{
		DocumentTitle: fmt.Sprintf("%s 邮箱验证码", SystemName),
		HeaderLabel:   "IDENTITY VERIFICATION",
		Eyebrow:       "ACCOUNT ACCESS CODE",
		Heading:       "邮箱身份验证",
		RecipientName: recipientName,
		Intro:         fmt.Sprintf("您正在验证 %s 账户。请使用以下验证码完成身份确认：", SystemName),
		Code:          code,
		Meta:          fmt.Sprintf("验证码将在 %d 分钟后失效，请勿向任何人透露。", expiresInMinutes),
		FooterTag:     "IDENTITY / VERIFIED",
	})
}

func RenderPasswordResetEmail(recipientName string, resetURL string, expiresInMinutes int) (string, error) {
	return renderHemaEmail(hemaEmailTemplateData{
		DocumentTitle: fmt.Sprintf("%s 密码重置", SystemName),
		HeaderLabel:   "ACCOUNT RECOVERY",
		Eyebrow:       "SECURE RECOVERY LINK",
		Heading:       "重置账户密码",
		RecipientName: recipientName,
		Intro:         fmt.Sprintf("我们收到了重置 %s 账户密码的请求。请点击下方按钮继续：", SystemName),
		ActionURL:     resetURL,
		ActionLabel:   "重置密码",
		Meta:          fmt.Sprintf("重置链接将在 %d 分钟后失效，请勿转发此邮件。", expiresInMinutes),
		FooterTag:     "ACCOUNT / RECOVERY",
	})
}

func RenderNotificationEmail(recipientName string, title string, content string) (string, error) {
	return renderHemaEmail(hemaEmailTemplateData{
		DocumentTitle: fmt.Sprintf("%s %s", SystemName, title),
		HeaderLabel:   "SYSTEM NOTIFICATION",
		Eyebrow:       "ACCOUNT STATUS MESSAGE",
		Heading:       title,
		RecipientName: recipientName,
		Intro:         fmt.Sprintf("这是来自 %s 的账户通知：", SystemName),
		ContentHTML:   template.HTML(content), // #nosec G203 -- content is generated by trusted server notification code.
		Meta:          "请登录控制台查看最新状态和完整信息。",
		FooterTag:     "SYSTEM / NOTICE",
	})
}
