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
	"strings"
	"testing"
)

func withSystemName(t *testing.T, name string) {
	t.Helper()
	original := SystemName
	SystemName = name
	t.Cleanup(func() {
		SystemName = original
	})
}

func TestRenderVerificationEmailUsesHemaTemplate(t *testing.T) {
	withSystemName(t, "hema API")

	content, err := RenderVerificationEmail("tester", "123456", 10)
	if err != nil {
		t.Fatal(err)
	}

	for _, expected := range []string{
		"HEMA / IDENTITY VERIFICATION",
		"邮箱身份验证",
		"tester",
		"123456",
		"验证码将在 10 分钟后失效",
		"hema API",
	} {
		if !strings.Contains(content, expected) {
			t.Fatalf("rendered content missing %q", expected)
		}
	}
}

func TestRenderPasswordResetEmailEscapesRecipientAndRendersLink(t *testing.T) {
	withSystemName(t, "hema API")

	content, err := RenderPasswordResetEmail(
		"<tester>",
		"https://ai.hemasir.online/user/reset?email=a@example.com&token=abc",
		10,
	)
	if err != nil {
		t.Fatal(err)
	}

	if strings.Contains(content, "<strong style=\"color:#173c2c;\"><tester>") {
		t.Fatal("recipient name was not escaped")
	}
	for _, expected := range []string{
		"&lt;tester&gt;",
		"重置账户密码",
		"https://ai.hemasir.online/user/reset?email=a@example.com&amp;token=abc",
		"重置链接将在 10 分钟后失效",
	} {
		if !strings.Contains(content, expected) {
			t.Fatalf("rendered content missing %q", expected)
		}
	}
}

func TestRenderNotificationEmailUsesSharedShell(t *testing.T) {
	withSystemName(t, "hema API")

	content, err := RenderNotificationEmail("admin", "通道状态", "通道已恢复。<br><strong>运行正常</strong>")
	if err != nil {
		t.Fatal(err)
	}

	for _, expected := range []string{
		"HEMA / SYSTEM NOTIFICATION",
		"通道状态",
		"通道已恢复。<br><strong>运行正常</strong>",
		"SYSTEM / NOTICE",
	} {
		if !strings.Contains(content, expected) {
			t.Fatalf("rendered content missing %q", expected)
		}
	}
}

func TestEmailRecipientName(t *testing.T) {
	if got := EmailRecipientName("tester@example.com"); got != "tester" {
		t.Fatalf("EmailRecipientName() = %q, want tester", got)
	}
	if got := EmailRecipientName("invalid"); got != "用户" {
		t.Fatalf("EmailRecipientName() = %q, want 用户", got)
	}
}
