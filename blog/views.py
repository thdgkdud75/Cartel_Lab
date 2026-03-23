from django.views.generic import ListView, DetailView, CreateView, UpdateView
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.urls import reverse_lazy
from .models import Post

class PostListView(ListView):
    model = Post
    template_name = "blog/post_list.html"
    context_object_name = "posts"

    def get_queryset(self):
        queryset = Post.objects.filter(is_published=True).select_related('author')
        tab = self.request.GET.get('tab')
        
        if tab == 'my' and self.request.user.is_authenticated:
            # 내 글 보기 필터링
            return queryset.filter(author=self.request.user)
        
        # 기본값: 전체 글 보기
        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['current_tab'] = self.request.GET.get('tab', 'all')
        return context

class PostDetailView(DetailView):
    model = Post
    template_name = "blog/post_detail.html"
    context_object_name = "post"

class PostCreateView(LoginRequiredMixin, CreateView):
    model = Post
    fields = ["title", "slug", "summary", "content", "thumbnail"]
    template_name = "blog/post_form.html"
    success_url = reverse_lazy("blog:post-list")

    def form_valid(self, form):
        form.instance.author = self.request.user
        return super().form_valid(form)

class PostUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = Post
    fields = ["title", "slug", "summary", "content", "thumbnail"]
    template_name = "blog/post_form.html"
    
    def test_func(self):
        post = self.get_object()
        return self.request.user == post.author or self.request.user.is_staff

    def get_success_url(self):
        return self.object.get_absolute_url()

class PostDeleteView(LoginRequiredMixin, UserPassesTestMixin, DetailView):
    model = Post
    
    def test_func(self):
        post = self.get_object()
        return self.request.user == post.author or self.request.user.is_staff

    def post(self, request, *args, **kwargs):
        post = self.get_object()
        post.delete()
        from django.http import HttpResponseRedirect
        return HttpResponseRedirect(reverse_lazy("blog:post-list"))
